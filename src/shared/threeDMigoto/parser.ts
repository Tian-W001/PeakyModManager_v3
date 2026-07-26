import { parseThreeDMigotoExpression } from "./expressionParser";
import {
  BareLineNode,
  CommandIfBranch,
  CommandIfStatement,
  CommandListAst,
  CommandPropertyStatement,
  CommandStatement,
  IniDiagnostic,
  IniDocument,
  IniLineNode,
  IniSectionNode,
  PropertyLineNode,
  ResourceValue,
  SectionFamily,
  SourcePosition,
  SourceRange,
} from "./types";

const COMMAND_LIST_PREFIXES = [
  "textureoverride",
  "commandlist",
  "shaderoverride",
  "customshader",
  "shaderregex",
  "builtincommandlist",
  "builtincustomshader",
] as const;

const COMMAND_LIST_EXACT = new Set([
  "constants",
  "present",
  "clearrendertargetview",
  "cleardepthstencilview",
  "clearunorderedaccessviewuint",
  "clearunorderedaccessviewfloat",
]);

const REGULAR_EXACT = new Set([
  "hunting",
  "logging",
  "system",
  "device",
  "rendering",
  "loader",
  "profile",
  "stereo",
  "convergencemap",
]);

interface PhysicalLine {
  raw: string;
  eol: string;
  offset: number;
  line: number;
}

type FlowKeyword = "if" | "elif" | "else if" | "else" | "endif";

interface FlowLine {
  keyword: FlowKeyword;
  condition?: string;
}

const makePosition = (offset: number, line: number, column: number): SourcePosition => ({
  offset,
  line,
  column,
});

const makeLineRange = (line: PhysicalLine): SourceRange => ({
  start: makePosition(line.offset, line.line, 1),
  end: makePosition(line.offset + line.raw.length, line.line, line.raw.length + 1),
});

const splitPhysicalLines = (source: string): PhysicalLine[] => {
  const lines: PhysicalLine[] = [];
  let offset = 0;
  let line = 1;

  while (offset < source.length) {
    const newline = source.slice(offset).search(/\r\n|\n|\r/);
    if (newline < 0) {
      lines.push({ raw: source.slice(offset), eol: "", offset, line });
      break;
    }

    const newlineOffset = offset + newline;
    const eol = source.startsWith("\r\n", newlineOffset) ? "\r\n" : source[newlineOffset];
    lines.push({
      raw: source.slice(offset, newlineOffset),
      eol,
      offset,
      line,
    });
    offset = newlineOffset + eol.length;
    line += 1;
  }

  return lines;
};

const dominantEol = (lines: PhysicalLine[]): "\r\n" | "\n" | "\r" | "" => {
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (line.eol) counts.set(line.eol, (counts.get(line.eol) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return (sorted[0]?.[0] as "\r\n" | "\n" | "\r" | undefined) ?? "";
};

const classifySection = (normalizedName: string): SectionFamily => {
  if (COMMAND_LIST_EXACT.has(normalizedName)) return "command-list";

  const commandPrefix = COMMAND_LIST_PREFIXES.find((prefix) => normalizedName.startsWith(prefix));
  if (commandPrefix) {
    if (commandPrefix === "shaderregex" && /\.(?:pattern|insertdeclarations|replace)(?:\.|$)/i.test(normalizedName)) {
      return "regular";
    }
    return "command-list";
  }

  if (normalizedName.startsWith("pool")) return "pool";
  if (normalizedName.startsWith("resource")) return "resource";
  if (normalizedName.startsWith("key")) return "key";
  if (normalizedName.startsWith("include")) return "include";
  if (normalizedName.startsWith("preset")) return "preset";
  if (REGULAR_EXACT.has(normalizedName)) return "regular";
  return "unknown";
};

const parseLine = (physical: PhysicalLine, id: number, hasBom: boolean): IniLineNode => {
  const rawForParsing = hasBom ? physical.raw.slice(1) : physical.raw;
  const leading = rawForParsing.match(/^[ \t]*/)?.[0] ?? "";
  const trimmed = rawForParsing.trim();
  const base = {
    id,
    line: physical.line,
    raw: physical.raw,
    eol: physical.eol,
    range: makeLineRange(physical),
  };

  if (!trimmed) return { ...base, kind: "blank" };

  if (rawForParsing.slice(leading.length).startsWith(";")) {
    return {
      ...base,
      kind: "comment",
      indent: leading,
      text: rawForParsing.slice(leading.length + 1),
    };
  }

  const leftTrimmed = rawForParsing.slice(leading.length);
  if (leftTrimmed.startsWith("[")) {
    const close = leftTrimmed.indexOf("]");
    const rawName = close >= 0 ? leftTrimmed.slice(1, close) : leftTrimmed.slice(1);
    const name = rawName.trim();
    return {
      ...base,
      kind: "section-header",
      name,
      normalizedName: name.toLowerCase(),
      closed: close >= 0,
    };
  }

  if (/^(?:(?:if|elif|else[ \t]+if)\b|else$|endif$)/i.test(trimmed)) {
    return {
      ...base,
      kind: "bare",
      text: trimmed,
    };
  }

  const delimiterOffset = rawForParsing.indexOf("=");
  if (delimiterOffset >= 0) {
    const key = rawForParsing.slice(0, delimiterOffset).trim();
    const value = rawForParsing.slice(delimiterOffset + 1).trim();
    return {
      ...base,
      kind: "property",
      indent: leading,
      key,
      normalizedKey: key.toLowerCase(),
      value,
      delimiterOffset: delimiterOffset + (hasBom ? 1 : 0),
    };
  }

  return {
    ...base,
    kind: "bare",
    text: trimmed,
  };
};

const diagnosticAtLine = (
  line: IniLineNode,
  code: string,
  message: string,
  severity: "error" | "warning" = "error"
): IniDiagnostic => ({
  code,
  message,
  severity,
  range: line.range,
});

const flowLine = (line: IniLineNode): FlowLine | undefined => {
  if (line.kind !== "bare") return undefined;
  const match = line.text.match(/^(if|elif|else[ \t]+if)(?:[ \t]+)(.+)$/i);
  if (match) {
    const keyword = match[1].toLowerCase().replace(/[ \t]+/g, " ") as "if" | "elif" | "else if";
    return { keyword, condition: match[2] };
  }
  if (/^else$/i.test(line.text)) return { keyword: "else" };
  if (/^endif$/i.test(line.text)) return { keyword: "endif" };
  return undefined;
};

const valueStartOffset = (line: PropertyLineNode): number => {
  let relative = line.delimiterOffset + 1;
  while (line.raw[relative] === " " || line.raw[relative] === "\t") relative += 1;
  return relative;
};

const expressionForProperty = (normalizedKey: string): boolean => {
  const withoutDeclaration = normalizedKey.replace(/^(?:(?:global|local|persist)[ \t]+)+/, "");
  return (
    withoutDeclaration.startsWith("$") ||
    withoutDeclaration === "condition" ||
    /^[xyzw]\d*$/.test(withoutDeclaration) ||
    withoutDeclaration === "separation" ||
    withoutDeclaration === "convergence"
  );
};

const looksLikeResourceTarget = (key: string): boolean =>
  /^(?:resource|pool|\$pool|[vhdgpc]s-(?:t|s|u|cb)\d+|(?:vb|so)\d+|ib|o[dD]|o\d+|this)(?:\\|\.|\[|$)/i.test(key);

const parseResourceValue = (key: string, value: string): ResourceValue | undefined => {
  if (!looksLikeResourceTarget(key) && !/^(?:copy|reference|ref)[ \t]+/i.test(value)) return undefined;

  let remainder = value.trim();
  let mode: ResourceValue["mode"] = "auto";
  const modeMatch = remainder.match(/^(copy|reference|ref)(?:[ \t]+)(.*)$/i);
  if (modeMatch) {
    mode = modeMatch[1].toLowerCase() === "copy" ? "copy" : "reference";
    remainder = modeMatch[2].trim();
  }

  let unlessNull = false;
  if (/[ \t]+unless_null$/i.test(remainder)) {
    unlessNull = true;
    remainder = remainder.replace(/[ \t]+unless_null$/i, "").trimEnd();
  }

  return {
    kind: "resource-value",
    mode,
    source: remainder,
    unlessNull,
    raw: value,
  };
};

class CommandListParser {
  readonly diagnostics: IniDiagnostic[] = [];

  constructor(private readonly section: IniSectionNode) {}

  parse(): CommandListAst {
    const result = this.parseStatements(0, new Set());
    return {
      kind: "command-list",
      sectionName: this.section.name,
      statements: result.statements,
      diagnostics: this.diagnostics,
      range: this.section.range,
    };
  }

  private parseStatements(
    start: number,
    stopKeywords: Set<FlowKeyword>
  ): { statements: CommandStatement[]; next: number; stop?: FlowLine } {
    const statements: CommandStatement[] = [];
    let cursor = start;

    while (cursor < this.section.body.length) {
      const line = this.section.body[cursor];
      const flow = flowLine(line);
      if (flow && stopKeywords.has(flow.keyword)) {
        return { statements, next: cursor, stop: flow };
      }

      if (flow?.keyword === "if") {
        const parsed = this.parseIf(cursor, flow);
        statements.push(parsed.statement);
        cursor = parsed.next;
        continue;
      }

      if (flow) {
        this.diagnostics.push(
          diagnosticAtLine(
            line,
            "3dmigoto-command-orphan-flow",
            `Statement "${flow.keyword}" does not match an open if block`
          )
        );
      }

      if (line.kind === "blank" || line.kind === "comment") {
        statements.push({ kind: "trivia", line });
      } else if (line.kind === "property") {
        statements.push(this.parseCommand(line));
      } else if (line.kind === "bare") {
        statements.push({ kind: "unknown", line });
      }
      cursor += 1;
    }

    return { statements, next: cursor };
  }

  private parseIf(start: number, opening: FlowLine): { statement: CommandIfStatement; next: number } {
    const openingLine = this.section.body[start] as BareLineNode;
    const branches: CommandIfBranch[] = [];
    let cursor = start;
    let currentFlow = opening;
    let seenElse = false;
    const stops = new Set<FlowKeyword>(["elif", "else if", "else", "endif"]);

    while (currentFlow.keyword !== "endif") {
      const branchLine = this.section.body[cursor] as BareLineNode;
      if (seenElse && currentFlow.keyword !== "else") {
        this.diagnostics.push(
          diagnosticAtLine(
            branchLine,
            "3dmigoto-command-branch-after-else",
            `Statement "${currentFlow.keyword}" cannot follow an else branch`
          )
        );
      }

      let condition;
      if (currentFlow.condition !== undefined) {
        const relative = Math.max(0, branchLine.raw.indexOf(currentFlow.condition));
        const parsed = parseThreeDMigotoExpression(currentFlow.condition, {
          offset: branchLine.range.start.offset + relative,
          line: branchLine.line,
          column: relative + 1,
        });
        condition = parsed.expression;
        this.diagnostics.push(...parsed.diagnostics);
      }

      const body = this.parseStatements(cursor + 1, stops);
      branches.push({
        keyword: currentFlow.keyword as CommandIfBranch["keyword"],
        line: branchLine,
        condition,
        statements: body.statements,
      });
      cursor = body.next;

      if (!body.stop) {
        this.diagnostics.push(
          diagnosticAtLine(openingLine, "3dmigoto-command-missing-endif", "If block is missing its endif statement")
        );
        const end = this.section.body[this.section.body.length - 1]?.range.end ?? openingLine.range.end;
        return {
          statement: {
            kind: "if",
            branches,
            range: { start: openingLine.range.start, end },
          },
          next: this.section.body.length,
        };
      }

      currentFlow = body.stop;
      if (currentFlow.keyword === "endif") {
        const endLine = this.section.body[cursor] as BareLineNode;
        return {
          statement: {
            kind: "if",
            branches,
            endLine,
            range: { start: openingLine.range.start, end: endLine.range.end },
          },
          next: cursor + 1,
        };
      }

      if (currentFlow.keyword === "else") seenElse = true;
    }

    return {
      statement: {
        kind: "if",
        branches,
        range: openingLine.range,
      },
      next: cursor,
    };
  }

  private parseCommand(line: PropertyLineNode): CommandPropertyStatement {
    let key = line.key;
    let phase: "pre" | "post" | undefined;
    const phaseMatch = key.match(/^(pre|post)[ \t]+(.+)$/i);
    if (phaseMatch) {
      phase = phaseMatch[1].toLowerCase() as "pre" | "post";
      key = phaseMatch[2].trim();
    }

    const normalizedKey = key.toLowerCase();
    const statement: CommandPropertyStatement = {
      kind: "command",
      line,
      phase,
      key,
      normalizedKey,
    };

    statement.resourceValue = parseResourceValue(key, line.value);

    if (expressionForProperty(normalizedKey)) {
      const relative = valueStartOffset(line);
      const parsed = parseThreeDMigotoExpression(line.value, {
        offset: line.range.start.offset + relative,
        line: line.line,
        column: relative + 1,
      });
      statement.expression = parsed.expression;
      this.diagnostics.push(...parsed.diagnostics);
    }

    return statement;
  }
}

const validatePreamble = (document: IniDocument): void => {
  for (const line of document.preamble) {
    if (line.kind === "blank" || line.kind === "comment") continue;
    if (line.kind !== "property") {
      document.diagnostics.push(
        diagnosticAtLine(
          line,
          "3dmigoto-preamble-invalid-entry",
          "Only namespace and condition properties are valid before the first section",
          "warning"
        )
      );
      continue;
    }

    if (line.normalizedKey === "namespace") {
      document.namespace = line.value;
      continue;
    }

    if (line.normalizedKey === "condition") {
      const relative = valueStartOffset(line);
      const parsed = parseThreeDMigotoExpression(line.value, {
        offset: line.range.start.offset + relative,
        line: line.line,
        column: relative + 1,
      });
      document.diagnostics.push(...parsed.diagnostics);
      continue;
    }

    document.diagnostics.push(
      diagnosticAtLine(line, "3dmigoto-preamble-unknown-property", `Unknown preamble property "${line.key}"`, "warning")
    );
  }
};

const validateSections = (document: IniDocument): void => {
  const seenSections = new Set<string>();

  for (const section of document.sections) {
    if (!section.header.closed) {
      document.diagnostics.push(
        diagnosticAtLine(section.header, "3dmigoto-section-unclosed", "Section header is missing a closing bracket")
      );
    }
    if (!section.name) {
      document.diagnostics.push(
        diagnosticAtLine(section.header, "3dmigoto-section-empty", "Section name cannot be empty")
      );
    }
    if (seenSections.has(section.normalizedName)) {
      document.diagnostics.push(
        diagnosticAtLine(
          section.header,
          "3dmigoto-section-duplicate",
          `Duplicate section "${section.name}" is ignored by 3DMigoto`,
          "warning"
        )
      );
    }
    seenSections.add(section.normalizedName);

    if (section.family === "unknown") {
      document.diagnostics.push(
        diagnosticAtLine(
          section.header,
          "3dmigoto-section-unknown",
          `Unknown 3DMigoto section family "${section.name}"`,
          "warning"
        )
      );
    }

    if (section.family !== "command-list") {
      const keys = new Set<string>();
      for (const line of section.body) {
        if (line.kind !== "property") continue;
        const duplicateAllowed =
          (section.family === "key" && (line.normalizedKey === "key" || line.normalizedKey === "back")) ||
          section.family === "include";
        if (keys.has(line.normalizedKey) && !duplicateAllowed) {
          document.diagnostics.push(
            diagnosticAtLine(
              line,
              "3dmigoto-property-duplicate",
              `Duplicate property "${line.key}" in a non-command-list section`,
              "warning"
            )
          );
        }
        keys.add(line.normalizedKey);
      }
    }

    if (section.family === "command-list") {
      const commandList = new CommandListParser(section).parse();
      section.commandList = commandList;
      document.diagnostics.push(...commandList.diagnostics);
    }
  }
};

export const parseThreeDMigotoIni = (source: string): IniDocument => {
  const physicalLines = splitPhysicalLines(source);
  const hasBom = source.startsWith("\uFEFF");
  const lines = physicalLines.map((line, index) => parseLine(line, index, hasBom && index === 0));
  const preamble: IniLineNode[] = [];
  const sections: IniSectionNode[] = [];
  let currentSection: IniSectionNode | undefined;

  for (const line of lines) {
    if (line.kind === "section-header") {
      currentSection = {
        kind: "section",
        name: line.name,
        normalizedName: line.normalizedName,
        family: classifySection(line.normalizedName),
        header: line,
        body: [],
        range: line.range,
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      preamble.push(line);
    } else {
      currentSection.body.push(line);
      currentSection.range = {
        start: currentSection.header.range.start,
        end: line.range.end,
      };
    }
  }

  const document: IniDocument = {
    kind: "document",
    source,
    bom: hasBom,
    dominantEol: dominantEol(physicalLines),
    lines,
    preamble,
    sections,
    diagnostics: [],
  };

  validatePreamble(document);
  validateSections(document);
  return document;
};

export const printThreeDMigotoIni = (document: IniDocument): string =>
  document.lines.map((line) => line.raw + line.eol).join("");

export const isThreeDMigotoCommandListSection = (sectionName: string): boolean =>
  classifySection(sectionName.trim().toLowerCase()) === "command-list";
