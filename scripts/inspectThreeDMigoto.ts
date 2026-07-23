#!/usr/bin/env -S npx tsx

import { readFile } from "node:fs/promises";
import path from "node:path";
import { threeDMigotoParser, ThreeDMigotoModContext } from "../src/shared/threeDMigoto";

interface CliOptions {
  files: string[];
  json: boolean;
  help: boolean;
}

interface FileReport {
  file: string;
  namespace?: string;
  keyBindings: Array<{
    id: string;
    section: string;
    type?: string;
    keys: readonly string[];
    backKeys: readonly string[];
    condition?: string;
    assignments: Array<{
      target: string;
      value: string;
      values: readonly string[];
    }>;
  }>;
  toggleKeys: string[];
  textureOverrides: Array<{
    section: string;
    hash?: string;
    properties: Record<string, readonly string[]>;
    resources: Array<{
      target: string;
      source: string;
      mode: string;
      unlessNull: boolean;
      phase?: string;
      branches: Array<{
        keyword: string;
        condition?: string;
      }>;
    }>;
  }>;
  diagnostics: Array<{
    severity: string;
    code: string;
    message: string;
    line: number;
    column: number;
  }>;
  error?: string;
}

const usage = `3DMigoto / ZZMI INI inspector

用法:
  npx tsx scripts/inspectThreeDMigoto.ts <file.ini> [more.ini...]
  npx tsx scripts/inspectThreeDMigoto.ts --json <file.ini>

选项:
  --json       输出机器可读的 JSON
  -h, --help   显示帮助

脚本接受一个或多个文件路径。文件管理器或其他启动器拖放文件时，只需把拖入路径作为参数传给本脚本。
`;

const parseArguments = (arguments_: string[]): CliOptions => {
  const files: string[] = [];
  let json = false;
  let help = false;

  for (const argument of arguments_) {
    if (argument === "--json") json = true;
    else if (argument === "--help" || argument === "-h") help = true;
    else if (argument.startsWith("-")) throw new Error(`未知选项: ${argument}`);
    else files.push(argument);
  }

  return { files, json, help };
};

const createReport = (file: string, context: ThreeDMigotoModContext): FileReport => ({
  file,
  namespace: context.document.namespace,
  keyBindings: Object.values(context.keyBindings).map((binding) => ({
    id: binding.id,
    section: binding.sectionName,
    type: binding.type,
    keys: binding.keys,
    backKeys: binding.backKeys,
    condition: binding.condition?.raw,
    assignments: binding.assignments.map((assignment) => ({
      target: assignment.target,
      value: assignment.rawValue,
      values: assignment.values,
    })),
  })),
  toggleKeys: Object.keys(context.toggleKeys),
  textureOverrides: Object.values(context.textureOverrides).map((textureOverride) => ({
    section: textureOverride.sectionName,
    hash: textureOverride.hash,
    properties: textureOverride.properties,
    resources: textureOverride.resources.map((resource) => ({
      target: resource.target,
      source: resource.source,
      mode: resource.mode,
      unlessNull: resource.unlessNull,
      phase: resource.phase,
      branches: resource.guards.map((guard) => ({
        keyword: guard.keyword,
        condition: guard.condition?.raw,
      })),
    })),
  })),
  diagnostics: context.diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    line: diagnostic.range.start.line,
    column: diagnostic.range.start.column,
  })),
});

const createReadErrorReport = (file: string, error: unknown): FileReport => ({
  file,
  keyBindings: [],
  toggleKeys: [],
  textureOverrides: [],
  diagnostics: [],
  error: error instanceof Error ? error.message : String(error),
});

const describeAssignment = (target: string, values: readonly string[]): string =>
  `    ${target} = ${values.join(" | ")}`;

const formatHumanReport = (report: FileReport): string => {
  const lines = [
    `文件: ${report.file}`,
    `命名空间: ${report.namespace || "(无)"}`,
    `Key bindings: ${report.keyBindings.length}，toggle/cycle: ${report.toggleKeys.length}`,
  ];

  if (report.error) {
    lines.push(`读取失败: ${report.error}`);
    return lines.join("\n");
  }

  for (const binding of report.keyBindings) {
    const details = [
      binding.type ? `type=${binding.type}` : undefined,
      binding.keys.length > 0 ? `key=${binding.keys.join(", ")}` : undefined,
      binding.backKeys.length > 0 ? `back=${binding.backKeys.join(", ")}` : undefined,
    ].filter((detail): detail is string => detail !== undefined);

    lines.push(`  [${binding.section}] id=${binding.id}${details.length > 0 ? ` (${details.join("; ")})` : ""}`);
    if (binding.condition) lines.push(`    condition = ${binding.condition}`);
    for (const assignment of binding.assignments) {
      lines.push(describeAssignment(assignment.target, assignment.values));
    }
  }

  lines.push(`Texture overrides: ${report.textureOverrides.length}`);
  for (const textureOverride of report.textureOverrides) {
    lines.push(
      `  [${textureOverride.section}]${textureOverride.hash ? ` hash=${textureOverride.hash}` : ""} ` +
        `resources=${textureOverride.resources.length}`
    );
    for (const resource of textureOverride.resources) {
      const modifiers = [
        resource.phase,
        resource.mode !== "auto" ? resource.mode : undefined,
        resource.unlessNull ? "unless_null" : undefined,
      ].filter((modifier): modifier is string => modifier !== undefined);
      const branch = resource.branches
        .map((item) => `${item.keyword}${item.condition ? ` ${item.condition}` : ""}`)
        .join(" -> ");
      lines.push(
        `    ${resource.target} <- ${resource.source || "(null)"}` +
          `${modifiers.length > 0 ? ` (${modifiers.join(", ")})` : ""}` +
          `${branch ? ` when ${branch}` : ""}`
      );
    }
  }

  lines.push(`诊断: ${report.diagnostics.length}`);
  for (const diagnostic of report.diagnostics) {
    lines.push(
      `  ${diagnostic.severity.toUpperCase()} ${diagnostic.line}:${diagnostic.column} ` +
        `${diagnostic.code} - ${diagnostic.message}`
    );
  }

  return lines.join("\n");
};

const inspectFile = async (inputPath: string): Promise<FileReport> => {
  const file = path.resolve(inputPath);
  try {
    const source = await readFile(file, "utf8");
    return createReport(file, threeDMigotoParser.parse(source));
  } catch (error) {
    return createReadErrorReport(file, error);
  }
};

const main = async (): Promise<void> => {
  let options: CliOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`);
    process.exitCode = 2;
    return;
  }

  if (options.help || options.files.length === 0) {
    process.stdout.write(usage);
    process.exitCode = options.help ? 0 : 2;
    return;
  }

  const reports = await Promise.all(options.files.map(inspectFile));
  if (options.json) {
    const output = reports.length === 1 ? reports[0] : reports;
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`${reports.map(formatHumanReport).join("\n\n")}\n`);
  }

  if (reports.some((report) => report.error || report.diagnostics.some((item) => item.severity === "error"))) {
    process.exitCode = 1;
  }
};

void main();
