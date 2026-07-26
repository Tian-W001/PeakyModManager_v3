import { parseThreeDMigotoExpression } from "./expressionParser";
import { parseThreeDMigotoIni } from "./parser";
import {
  CommandIfBranch,
  CommandStatement,
  ExpressionNode,
  IniDiagnostic,
  IniDocument,
  IniSectionNode,
  PropertyLineNode,
} from "./types";

export type PropertyBag = Readonly<Record<string, readonly string[]>>;

export interface KeyAssignment {
  target: string;
  normalizedTarget: string;
  rawValue: string;
  values: readonly string[];
  line: PropertyLineNode;
}

export interface KeyBindingContext {
  id: string;
  sectionName: string;
  type?: string;
  key?: string;
  keys: readonly string[];
  backKey?: string;
  backKeys: readonly string[];
  condition?: ExpressionNode;
  assignments: readonly KeyAssignment[];
  variables: readonly KeyAssignment[];
  properties: PropertyBag;
  section: IniSectionNode;
}

export interface PersistentVariableContext {
  id: string;
  name: string;
  normalizedName: string;
  rawValue: string;
  expression?: ExpressionNode;
  line: PropertyLineNode;
  section: IniSectionNode;
}

export interface ResourceBindingGuard {
  keyword: CommandIfBranch["keyword"];
  condition?: ExpressionNode;
}

export interface TextureResourceBinding {
  target: string;
  source: string;
  mode: "auto" | "copy" | "reference";
  unlessNull: boolean;
  phase?: "pre" | "post";
  guards: readonly ResourceBindingGuard[];
  line: PropertyLineNode;
}

export interface TextureOverrideContext {
  id: string;
  sectionName: string;
  hash?: string;
  properties: PropertyBag;
  resourceBindings: readonly TextureResourceBinding[];
  resources: readonly TextureResourceBinding[];
  commands: readonly CommandStatement[];
  section: IniSectionNode;
}

export interface ThreeDMigotoModContext {
  document: IniDocument;
  diagnostics: readonly IniDiagnostic[];
  keyBindings: Readonly<Record<string, KeyBindingContext>>;
  toggleKeys: Readonly<Record<string, KeyBindingContext>>;
  persistentVariables: Readonly<Record<string, PersistentVariableContext>>;
  persistentVariableDeclarations: readonly PersistentVariableContext[];
  textureOverrides: Readonly<Record<string, TextureOverrideContext>>;
  getKeyBinding: (name: string) => KeyBindingContext | undefined;
  getPersistentVariable: (name: string) => PersistentVariableContext | undefined;
  getTextureOverride: (name: string) => TextureOverrideContext | undefined;
}

const KEY_METADATA = new Set([
  "key",
  "back",
  "type",
  "smart",
  "wrap",
  "condition",
  "delay",
  "transition",
  "transition_type",
  "release_delay",
  "release_transition",
  "release_transition_type",
]);

const freezeArray = <T>(items: T[]): readonly T[] => Object.freeze(items);

const propertyBag = (section: IniSectionNode): PropertyBag => {
  const mutable: Record<string, string[]> = Object.create(null);
  for (const line of section.body) {
    if (line.kind !== "property") continue;
    (mutable[line.normalizedKey] ??= []).push(line.value);
  }

  const frozen: Record<string, readonly string[]> = Object.create(null);
  for (const [key, values] of Object.entries(mutable)) frozen[key] = freezeArray(values);
  return Object.freeze(frozen);
};

const firstProperty = (properties: PropertyBag, name: string): string | undefined =>
  properties[name.toLowerCase()]?.[0];

const splitCommaSeparated = (value: string): readonly string[] => {
  const values: string[] = [];
  let start = 0;
  let parenthesisDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") parenthesisDepth += 1;
    else if (character === ")") parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    else if (character === "[") bracketDepth += 1;
    else if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (character === "," && parenthesisDepth === 0 && bracketDepth === 0) {
      values.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  values.push(value.slice(start).trim());
  return freezeArray(values);
};

const keyBindingId = (sectionName: string): string => {
  const suffix = sectionName.slice(3).trim();
  if (!suffix) return sectionName;
  if (suffix === suffix.toUpperCase()) return suffix.toLowerCase();
  return suffix[0].toLowerCase() + suffix.slice(1);
};

const valueOffset = (line: PropertyLineNode): number => {
  let relative = line.delimiterOffset + 1;
  while (line.raw[relative] === " " || line.raw[relative] === "\t") relative += 1;
  return relative;
};

const buildKeyBinding = (section: IniSectionNode, diagnostics: IniDiagnostic[]): KeyBindingContext => {
  const properties = propertyBag(section);
  const assignments: KeyAssignment[] = [];

  for (const line of section.body) {
    if (line.kind !== "property" || KEY_METADATA.has(line.normalizedKey)) continue;
    assignments.push({
      target: line.key,
      normalizedTarget: line.normalizedKey,
      rawValue: line.value,
      values: splitCommaSeparated(line.value),
      line,
    });
  }

  let condition: ExpressionNode | undefined;
  const conditionLine = section.body.find(
    (line): line is PropertyLineNode => line.kind === "property" && line.normalizedKey === "condition"
  );
  if (conditionLine) {
    const relative = valueOffset(conditionLine);
    const parsed = parseThreeDMigotoExpression(conditionLine.value, {
      offset: conditionLine.range.start.offset + relative,
      line: conditionLine.line,
      column: relative + 1,
    });
    condition = parsed.expression;
    diagnostics.push(...parsed.diagnostics);
  }

  const keys = freezeArray([...(properties.key ?? [])]);
  const backKeys = freezeArray([...(properties.back ?? [])]);
  const frozenAssignments = freezeArray(assignments);

  return Object.freeze({
    id: keyBindingId(section.name),
    sectionName: section.name,
    type: firstProperty(properties, "type")?.toLowerCase(),
    key: keys[0],
    keys,
    backKey: backKeys[0],
    backKeys,
    condition,
    assignments: frozenAssignments,
    variables: freezeArray(assignments.filter((assignment) => assignment.target.startsWith("$"))),
    properties,
    section,
  });
};

const buildPersistentVariables = (document: IniDocument): PersistentVariableContext[] => {
  const variables: PersistentVariableContext[] = [];

  for (const section of document.sections) {
    for (const line of section.body) {
      if (line.kind !== "property") continue;
      const match = line.key.match(/^global[ \t]+persist[ \t]+(\$[^ \t]+)$/i);
      if (!match) continue;

      const parsed = parseThreeDMigotoExpression(line.value, {
        offset: line.range.start.offset + valueOffset(line),
        line: line.line,
        column: valueOffset(line) + 1,
      });
      const name = match[1];
      variables.push(
        Object.freeze({
          id: name.slice(1),
          name,
          normalizedName: name.toLowerCase(),
          rawValue: line.value,
          expression: parsed.expression,
          line,
          section,
        })
      );
    }
  }

  return variables;
};

const collectResourceBindings = (
  statements: readonly CommandStatement[],
  guards: readonly ResourceBindingGuard[] = []
): TextureResourceBinding[] => {
  const bindings: TextureResourceBinding[] = [];

  for (const statement of statements) {
    if (statement.kind === "command" && statement.resourceValue) {
      bindings.push({
        target: statement.key,
        source: statement.resourceValue.source,
        mode: statement.resourceValue.mode,
        unlessNull: statement.resourceValue.unlessNull,
        phase: statement.phase,
        guards: freezeArray([...guards]),
        line: statement.line,
      });
      continue;
    }

    if (statement.kind === "if") {
      for (const branch of statement.branches) {
        bindings.push(
          ...collectResourceBindings(branch.statements, [
            ...guards,
            {
              keyword: branch.keyword,
              condition: branch.condition,
            },
          ])
        );
      }
    }
  }

  return bindings;
};

const buildTextureOverride = (section: IniSectionNode): TextureOverrideContext => {
  const properties = propertyBag(section);
  const commands = freezeArray([...(section.commandList?.statements ?? [])]);
  const resources = freezeArray(collectResourceBindings(commands));

  return Object.freeze({
    id: section.name,
    sectionName: section.name,
    hash: firstProperty(properties, "hash"),
    properties,
    resourceBindings: resources,
    resources,
    commands,
    section,
  });
};

const isToggleLike = (binding: KeyBindingContext): boolean =>
  binding.type === "toggle" ||
  binding.type === "cycle" ||
  binding.assignments.some((assignment) => assignment.values.length > 1);

export const createThreeDMigotoModContext = (document: IniDocument): ThreeDMigotoModContext => {
  const diagnostics = [...document.diagnostics];
  const keyBindings: Record<string, KeyBindingContext> = Object.create(null);
  const toggleKeys: Record<string, KeyBindingContext> = Object.create(null);
  const persistentVariables: Record<string, PersistentVariableContext> = Object.create(null);
  const textureOverrides: Record<string, TextureOverrideContext> = Object.create(null);
  const keyLookup = new Map<string, KeyBindingContext>();
  const variableLookup = new Map<string, PersistentVariableContext>();
  const textureLookup = new Map<string, TextureOverrideContext>();
  const persistentVariableDeclarations = freezeArray(buildPersistentVariables(document));

  for (const variable of persistentVariableDeclarations) {
    if (!(variable.id in persistentVariables)) persistentVariables[variable.id] = variable;
    if (!variableLookup.has(variable.normalizedName)) variableLookup.set(variable.normalizedName, variable);
  }

  for (const section of document.sections) {
    if (section.family === "key") {
      const binding = buildKeyBinding(section, diagnostics);
      const lookupNames = [binding.id, binding.sectionName];
      if (!(binding.id in keyBindings)) keyBindings[binding.id] = binding;
      if (isToggleLike(binding) && !(binding.id in toggleKeys)) toggleKeys[binding.id] = binding;
      for (const name of lookupNames) {
        const normalized = name.toLowerCase();
        if (!keyLookup.has(normalized)) keyLookup.set(normalized, binding);
      }
      continue;
    }

    if (section.normalizedName.startsWith("textureoverride")) {
      const textureOverride = buildTextureOverride(section);
      if (!(textureOverride.id in textureOverrides)) textureOverrides[textureOverride.id] = textureOverride;
      const normalized = textureOverride.sectionName.toLowerCase();
      if (!textureLookup.has(normalized)) textureLookup.set(normalized, textureOverride);
    }
  }

  return Object.freeze({
    document,
    diagnostics: freezeArray(diagnostics),
    keyBindings: Object.freeze(keyBindings),
    toggleKeys: Object.freeze(toggleKeys),
    persistentVariables: Object.freeze(persistentVariables),
    persistentVariableDeclarations,
    textureOverrides: Object.freeze(textureOverrides),
    getKeyBinding: (name: string) => keyLookup.get(name.toLowerCase()),
    getPersistentVariable: (name: string) =>
      variableLookup.get((name.startsWith("$") ? name : `$${name}`).toLowerCase()),
    getTextureOverride: (name: string) => textureLookup.get(name.toLowerCase()),
  });
};

export const parseThreeDMigotoMod = (source: string): ThreeDMigotoModContext =>
  createThreeDMigotoModContext(parseThreeDMigotoIni(source));

export const threeDMigotoParser = Object.freeze({
  parse: parseThreeDMigotoMod,
});
