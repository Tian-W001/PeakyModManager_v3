import { IniDocument, IniSectionNode, PropertyLineNode } from "./types";

export interface ThreeDMigotoTextEdit {
  start: number;
  end: number;
  text: string;
}

const lineEndOffset = (line: PropertyLineNode): number => line.range.end.offset + line.eol.length;

const propertyValueBounds = (line: PropertyLineNode): { start: number; end: number } => {
  let start = line.delimiterOffset + 1;
  while (line.raw[start] === " " || line.raw[start] === "\t") start += 1;

  let end = line.raw.length;
  while (end > start && (line.raw[end - 1] === " " || line.raw[end - 1] === "\t")) end -= 1;
  return {
    start: line.range.start.offset + start,
    end: line.range.start.offset + end,
  };
};

export const applyThreeDMigotoTextEdits = (source: string, edits: readonly ThreeDMigotoTextEdit[]): string => {
  const ordered = [...edits].sort((left, right) => right.start - left.start || right.end - left.end);
  let previousStart = source.length;
  let result = source;

  for (const edit of ordered) {
    if (edit.start < 0 || edit.end < edit.start || edit.end > source.length) {
      throw new Error(`Invalid 3DMigoto text edit range ${edit.start}:${edit.end}`);
    }
    if (edit.end > previousStart) throw new Error("Overlapping 3DMigoto text edits");
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    previousStart = edit.start;
  }

  return result;
};

export const replaceThreeDMigotoPropertyValue = (
  document: IniDocument,
  line: PropertyLineNode,
  value: string
): string => {
  return applyThreeDMigotoTextEdits(document.source, [createThreeDMigotoPropertyValueEdit(line, value)]);
};

export const createThreeDMigotoPropertyValueEdit = (line: PropertyLineNode, value: string): ThreeDMigotoTextEdit => ({
  ...propertyValueBounds(line),
  text: value,
});

const propertyRawWithValue = (line: PropertyLineNode, value: string): string => {
  const bounds = propertyValueBounds(line);
  const start = bounds.start - line.range.start.offset;
  const end = bounds.end - line.range.start.offset;
  return line.raw.slice(0, start) + value + line.raw.slice(end);
};

const defaultPropertyRaw = (key: string, value: string): string => `${key} = ${value}`;

export interface ReplaceSectionPropertyOptions {
  insertAfterKeys?: readonly string[];
}

export const replaceThreeDMigotoSectionPropertyValues = (
  document: IniDocument,
  section: IniSectionNode,
  key: string,
  values: readonly string[],
  options: ReplaceSectionPropertyOptions = {}
): string => {
  const normalizedKey = key.toLowerCase();
  const existing = section.body.filter(
    (line): line is PropertyLineNode => line.kind === "property" && line.normalizedKey === normalizedKey
  );
  const edits: ThreeDMigotoTextEdit[] = [];
  const sharedCount = Math.min(existing.length, values.length);

  for (let index = 0; index < sharedCount; index += 1) {
    const bounds = propertyValueBounds(existing[index]);
    edits.push({ ...bounds, text: values[index] });
  }

  for (const line of existing.slice(values.length)) {
    edits.push({
      start: line.range.start.offset,
      end: lineEndOffset(line),
      text: "",
    });
  }

  const extraValues = values.slice(existing.length);
  if (extraValues.length > 0) {
    const eol = document.dominantEol || "\n";
    let anchor: PropertyLineNode | undefined = existing[existing.length - 1];
    if (!anchor && options.insertAfterKeys) {
      const allowed = new Set(options.insertAfterKeys.map((candidate) => candidate.toLowerCase()));
      anchor = [...section.body]
        .reverse()
        .find((line): line is PropertyLineNode => line.kind === "property" && allowed.has(line.normalizedKey));
    }

    const template = existing[0] ?? anchor;
    const rawLines = extraValues.map((value) =>
      template && template.normalizedKey === normalizedKey
        ? propertyRawWithValue(template, value)
        : defaultPropertyRaw(key, value)
    );

    if (anchor) {
      const offset = lineEndOffset(anchor);
      const prefix = anchor.eol ? "" : eol;
      const suffix = anchor.eol ? eol : "";
      edits.push({
        start: offset,
        end: offset,
        text: prefix + rawLines.join(eol) + suffix,
      });
    } else {
      const offset = section.header.range.end.offset + section.header.eol.length;
      const prefix = section.header.eol ? "" : eol;
      edits.push({
        start: offset,
        end: offset,
        text: prefix + rawLines.join(eol) + eol,
      });
    }
  }

  return applyThreeDMigotoTextEdits(document.source, edits);
};
