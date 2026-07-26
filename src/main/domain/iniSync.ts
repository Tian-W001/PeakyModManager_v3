import {
  applyThreeDMigotoTextEdits,
  ChangeKeyBindingRequest,
  ChangeKeyBindingResult,
  ChangeToggleStateRequest,
  ChangeToggleStateResult,
  ConfigErrorCode,
  ConfigOperationFailure,
  createThreeDMigotoPropertyValueEdit,
  ExpressionNode,
  GetModToggleControlsResult,
  isFiniteNumericToggleState,
  KeyBindingSnapshot,
  ModToggleControl,
  parseThreeDMigotoExpression,
  parseThreeDMigotoIni,
  replaceThreeDMigotoPropertyValue,
  replaceThreeDMigotoSectionPropertyValues,
  SkippedToggleState,
  SyncedToggleChange,
  SyncTogglesResult,
  ThreeDMigotoTextEdit,
  threeDMigotoParser,
} from "../../shared/threeDMigoto";

export interface IniSyncDeps {
  getD3dxUserPath: () => string | null;
  getLibraryPath: () => string | null;
  pathExists: (path: string) => Promise<boolean>;
  readFile: (path: string, encoding: string) => Promise<string>;
  replaceFile: (path: string, content: string) => Promise<void>;
  listIniFiles: (rootPath: string) => Promise<string[]>;
  resolveInside: (basePath: string, ...segments: string[]) => string | null;
  isPathInside: (basePath: string, targetPath: string) => boolean;
  realpath: (path: string) => Promise<string>;
  pathExtname: (path: string) => string;
  escapeRegExp: (value: string) => string;
}

interface RuntimeState {
  iniPath: string;
  variableName: string;
  rawValue: string;
  numericValue: number;
}

interface RuntimeStateExtraction {
  states: RuntimeState[];
  skipped: SkippedToggleState[];
}

interface ResolvedModRoot {
  ok: true;
  modPath: string;
  realModPath: string;
}

interface ResolvedIniTarget {
  ok: true;
  iniPath: string;
  fullPath: string;
}

const fileQueues = new Map<string, Promise<void>>();

const failure = (code: ConfigErrorCode, message: string): ConfigOperationFailure => ({
  ok: false,
  code,
  message,
});

const withFileLock = async <T>(filePath: string, operation: () => Promise<T>): Promise<T> => {
  const previous = fileQueues.get(filePath) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  fileQueues.set(filePath, tail);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (fileQueues.get(filePath) === tail) fileQueues.delete(filePath);
  }
};

const numericExpressionValue = (expression: ExpressionNode | undefined): number | undefined => {
  if (!expression) return undefined;
  if (expression.kind === "number") return Number.isFinite(expression.value) ? expression.value : undefined;
  if (expression.kind === "group") return numericExpressionValue(expression.expression);
  if (expression.kind !== "unary" || (expression.operator !== "+" && expression.operator !== "-")) return undefined;
  const operand = numericExpressionValue(expression.operand);
  if (operand === undefined) return undefined;
  return expression.operator === "-" ? -operand : operand;
};

const parseNumericLiteral = (rawValue: string): number | undefined => {
  const parsed = parseThreeDMigotoExpression(rawValue);
  if (parsed.diagnostics.length > 0) return undefined;
  return numericExpressionValue(parsed.expression);
};

const normalizeVariableName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
};

const hasBlockingDiagnostics = (source: string): boolean =>
  threeDMigotoParser.parse(source).diagnostics.some((diagnostic) => diagnostic.severity === "error");

const resolveModRoot = async (
  modName: string,
  deps: IniSyncDeps
): Promise<ResolvedModRoot | ConfigOperationFailure> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) {
    return failure("library-not-configured", "Library path is not configured or does not exist");
  }
  if (!modName || modName === "." || modName === ".." || /[/\\]/.test(modName)) {
    return failure("invalid-path", "Mod name must be a single directory name");
  }

  const modPath = deps.resolveInside(libraryPath, modName);
  if (!modPath) return failure("invalid-path", "Mod path escapes the library");
  if (!(await deps.pathExists(modPath))) return failure("mod-not-found", `Mod "${modName}" was not found`);

  try {
    return {
      ok: true,
      modPath,
      realModPath: await deps.realpath(modPath),
    };
  } catch (error) {
    return failure("mod-not-found", `Unable to resolve Mod path: ${String(error)}`);
  }
};

const resolveIniTarget = async (
  root: ResolvedModRoot,
  iniPath: string,
  deps: IniSyncDeps
): Promise<ResolvedIniTarget | ConfigOperationFailure> => {
  if (!iniPath || deps.pathExtname(iniPath).toLowerCase() !== ".ini") {
    return failure("invalid-path", "INI path must be a relative .ini file");
  }

  const fullPath = deps.resolveInside(root.modPath, iniPath);
  if (!fullPath) return failure("invalid-path", `INI path "${iniPath}" escapes the Mod directory`);
  if (!(await deps.pathExists(fullPath))) return failure("ini-not-found", `INI file "${iniPath}" was not found`);

  try {
    const realPath = await deps.realpath(fullPath);
    if (!deps.isPathInside(root.realModPath, realPath)) {
      return failure("invalid-path", `INI path "${iniPath}" resolves outside the Mod directory`);
    }
  } catch (error) {
    return failure("ini-not-found", `Unable to resolve INI file "${iniPath}": ${String(error)}`);
  }

  return {
    ok: true,
    iniPath: iniPath.replace(/\\/g, "/"),
    fullPath,
  };
};

const extractRuntimeStates = (modName: string, source: string, deps: IniSyncDeps): RuntimeStateExtraction => {
  const document = parseThreeDMigotoIni(source);
  const prefix = new RegExp(`^\\$[/\\\\]mods[/\\\\]${deps.escapeRegExp(modName)}[/\\\\](.+?\\.ini)[/\\\\](.+)$`, "i");
  const latest = new Map<string, RuntimeState | SkippedToggleState>();

  for (const line of document.lines) {
    if (line.kind !== "property") continue;
    const match = line.key.match(prefix);
    if (!match) continue;

    const iniPath = match[1].replace(/\\/g, "/");
    const variableName = normalizeVariableName(match[2]);
    const numericValue = parseNumericLiteral(line.value);
    const key = `${iniPath.toLowerCase()}\0${variableName.toLowerCase()}`;

    if (numericValue === undefined) {
      latest.set(key, {
        iniPath,
        variableName,
        reason: "invalid-state",
        message: `Runtime state "${line.value}" is not a finite numeric literal`,
      });
    } else {
      latest.set(key, {
        iniPath,
        variableName,
        rawValue: line.value,
        numericValue,
      });
    }
  }

  const states: RuntimeState[] = [];
  const skipped: SkippedToggleState[] = [];
  for (const entry of latest.values()) {
    if ("reason" in entry) skipped.push(entry);
    else states.push(entry);
  }
  return { states, skipped };
};

export const findAllTogglesInD3dxUser = async (
  modName: string,
  deps: IniSyncDeps
): Promise<Record<string, Record<string, string>>> => {
  const d3dxUserPath = deps.getD3dxUserPath();
  if (!d3dxUserPath || !(await deps.pathExists(d3dxUserPath))) throw new Error("d3dxUserPath not set");

  const source = await deps.readFile(d3dxUserPath, "utf-8");
  const { states } = extractRuntimeStates(modName, source, deps);
  const result: Record<string, Record<string, string>> = {};

  for (const state of states) {
    (result[state.iniPath] ??= {})[state.variableName.slice(1)] = state.rawValue;
  }
  return result;
};

const keyBindingSections = (source: string, keyBindingId: string) => {
  const document = parseThreeDMigotoIni(source);
  const normalized = keyBindingId.toLowerCase();
  return document.sections.filter(
    (section) =>
      section.family === "key" &&
      (section.normalizedName === normalized || section.name.slice(3).trim().toLowerCase() === normalized)
  );
};

const normalizeKeys = (values: unknown, allowEmpty: boolean): string[] | undefined => {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) return undefined;
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed || /[\r\n\0]/.test(trimmed)) return undefined;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return undefined;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
};

const safelyReplaceSource = async (
  fullPath: string,
  originalSource: string,
  nextSource: string,
  deps: IniSyncDeps
): Promise<ConfigOperationFailure | undefined> => {
  const latestSource = await deps.readFile(fullPath, "utf-8");
  if (latestSource !== originalSource) {
    return failure("conflict", `INI file changed while it was being edited: ${fullPath}`);
  }

  try {
    await deps.replaceFile(fullPath, nextSource);
    return undefined;
  } catch (error) {
    return failure("write-failed", `Failed to replace INI file: ${String(error)}`);
  }
};

export const getModToggleControls = async (modName: string, deps: IniSyncDeps): Promise<GetModToggleControlsResult> => {
  if (typeof modName !== "string") {
    return {
      ...failure("invalid-request", "Mod name must be a string"),
      toggles: [],
      warnings: [],
    };
  }

  const root = await resolveModRoot(modName, deps);
  if (!root.ok) return { ...root, toggles: [], warnings: [] };

  let iniPaths: string[];
  try {
    iniPaths = await deps.listIniFiles(root.modPath);
  } catch (error) {
    return {
      ...failure("internal-error", `Failed to scan Mod INI files: ${String(error)}`),
      toggles: [],
      warnings: [],
    };
  }

  const toggles: ModToggleControl[] = [];
  const warnings: GetModToggleControlsResult["warnings"] = [];
  const orderedPaths = [...iniPaths].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );

  for (const iniPath of orderedPaths) {
    const target = await resolveIniTarget(root, iniPath, deps);
    if (!target.ok) {
      warnings.push({ iniPath, message: target.message });
      continue;
    }

    let source: string;
    try {
      source = await deps.readFile(target.fullPath, "utf-8");
    } catch (error) {
      warnings.push({ iniPath: target.iniPath, message: `Failed to read INI file: ${String(error)}` });
      continue;
    }

    const context = threeDMigotoParser.parse(source);
    if (context.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      warnings.push({
        iniPath: target.iniPath,
        message: `INI file "${target.iniPath}" contains parser diagnostics`,
      });
    }

    for (const constant of context.getAllPersistConstants()) {
      const keyBinding = context.getKeyBindingOf(constant);
      toggles.push({
        id: `${target.iniPath}:${constant.line.line}:${constant.normalizedName}`,
        iniPath: target.iniPath,
        variableName: constant.name,
        state: constant.rawValue,
        keyBindingId: keyBinding?.sectionName,
        binding: keyBinding?.keys[0],
      });
    }
  }

  return { ok: true, toggles, warnings };
};

export const changeKeyBinding = async (
  request: ChangeKeyBindingRequest,
  deps: IniSyncDeps
): Promise<ChangeKeyBindingResult> => {
  if (
    !request ||
    typeof request.modName !== "string" ||
    typeof request.iniPath !== "string" ||
    typeof request.keyBindingId !== "string"
  ) {
    return failure("invalid-request", "Invalid changeKeyBinding request");
  }
  const keys = normalizeKeys(request.keys, false);
  const backKeys = request.backKeys === undefined ? undefined : normalizeKeys(request.backKeys, true);
  if (!keys || (request.backKeys !== undefined && !backKeys) || !request.keyBindingId.trim()) {
    return failure("invalid-request", "Key bindings must contain unique, non-empty single-line values");
  }

  const root = await resolveModRoot(request.modName, deps);
  if (!root.ok) return root;
  const target = await resolveIniTarget(root, request.iniPath, deps);
  if (!target.ok) return target;

  return withFileLock(target.fullPath, async () => {
    const source = await deps.readFile(target.fullPath, "utf-8");
    const context = threeDMigotoParser.parse(source);

    const keyBindingId = request.keyBindingId.trim();
    const sections = keyBindingSections(source, keyBindingId);
    if (sections.length === 0)
      return failure("target-not-found", `Key binding "${request.keyBindingId}" was not found`);
    if (sections.length > 1) {
      return failure("target-ambiguous", `Key binding "${request.keyBindingId}" matches multiple sections`);
    }

    const binding = context.getKeyBinding(keyBindingId);
    if (!binding) return failure("target-not-found", `Key binding "${request.keyBindingId}" was not found`);
    const before: KeyBindingSnapshot = {
      keys: [...binding.keys],
      backKeys: [...binding.backKeys],
    };
    const after: KeyBindingSnapshot = {
      keys,
      backKeys: backKeys ?? before.backKeys,
    };
    if (JSON.stringify(before) === JSON.stringify(after)) {
      return {
        ok: true,
        changed: false,
        modName: request.modName,
        iniPath: target.iniPath,
        before,
        after,
      };
    }

    let nextSource = replaceThreeDMigotoSectionPropertyValues(context.document, sections[0], "key", keys);
    if (backKeys !== undefined) {
      const nextContext = threeDMigotoParser.parse(nextSource);
      const nextSection = keyBindingSections(nextSource, keyBindingId)[0];
      nextSource = replaceThreeDMigotoSectionPropertyValues(nextContext.document, nextSection, "back", backKeys, {
        insertAfterKeys: ["key"],
      });
    }

    const verified = threeDMigotoParser.parse(nextSource);
    const verifiedBinding = verified.getKeyBinding(keyBindingId);
    if (
      !verifiedBinding ||
      JSON.stringify([...verifiedBinding.keys]) !== JSON.stringify(after.keys) ||
      JSON.stringify([...verifiedBinding.backKeys]) !== JSON.stringify(after.backKeys)
    ) {
      return failure("parse-error", "Edited key binding did not pass parser verification");
    }

    const writeFailure = await safelyReplaceSource(target.fullPath, source, nextSource, deps);
    if (writeFailure) return writeFailure;
    return {
      ok: true,
      changed: true,
      modName: request.modName,
      iniPath: target.iniPath,
      before,
      after,
    };
  });
};

export const changeToggleState = async (
  request: ChangeToggleStateRequest,
  deps: IniSyncDeps
): Promise<ChangeToggleStateResult> => {
  if (
    !request ||
    typeof request.modName !== "string" ||
    typeof request.iniPath !== "string" ||
    typeof request.variableName !== "string" ||
    typeof request.value !== "string" ||
    /[\r\n\0]/.test(request.value) ||
    !isFiniteNumericToggleState(request.value) ||
    !request.variableName.trim()
  ) {
    return failure("invalid-request", "Toggle state must be a finite numeric value");
  }

  const root = await resolveModRoot(request.modName, deps);
  if (!root.ok) return root;
  const target = await resolveIniTarget(root, request.iniPath, deps);
  if (!target.ok) return target;

  return withFileLock(target.fullPath, async () => {
    const source = await deps.readFile(target.fullPath, "utf-8");
    const context = threeDMigotoParser.parse(source);

    const variableName = normalizeVariableName(request.variableName);
    const declarations = context.persistentVariableDeclarations.filter(
      (variable) => variable.normalizedName === variableName.toLowerCase()
    );
    if (declarations.length === 0) {
      return failure("target-not-found", `Persistent variable "${variableName}" was not found`);
    }
    if (declarations.length > 1) {
      return failure("target-ambiguous", `Persistent variable "${variableName}" has multiple declarations`);
    }

    const declaration = declarations[0];
    const nextValue = request.value.trim();
    const before = { variableName: declaration.name, value: declaration.rawValue };
    const after = { variableName: declaration.name, value: nextValue };
    if (declaration.rawValue === nextValue) {
      return {
        ok: true,
        changed: false,
        modName: request.modName,
        iniPath: target.iniPath,
        before,
        after,
      };
    }

    const nextSource = replaceThreeDMigotoPropertyValue(context.document, declaration.line, nextValue);
    const verified = threeDMigotoParser.parse(nextSource);
    const verifiedVariables = verified.persistentVariableDeclarations.filter(
      (variable) => variable.normalizedName === variableName.toLowerCase()
    );
    if (verifiedVariables.length !== 1 || verifiedVariables[0].rawValue !== nextValue) {
      return failure("parse-error", "Edited toggle state did not pass parser verification");
    }

    const writeFailure = await safelyReplaceSource(target.fullPath, source, nextSource, deps);
    if (writeFailure) return writeFailure;
    return {
      ok: true,
      changed: true,
      modName: request.modName,
      iniPath: target.iniPath,
      before,
      after,
    };
  });
};

export const syncToggles = async (modName: string, deps: IniSyncDeps): Promise<SyncTogglesResult> => {
  if (typeof modName !== "string") {
    return {
      ...failure("invalid-request", "Mod name must be a string"),
      changes: [],
      skipped: [],
    };
  }
  const root = await resolveModRoot(modName, deps);
  if (!root.ok) return { ...root, changes: [], skipped: [] };

  const d3dxUserPath = deps.getD3dxUserPath();
  if (!d3dxUserPath || !(await deps.pathExists(d3dxUserPath))) {
    return {
      ...failure("d3dx-user-not-configured", "d3dx_user.ini path is not configured or does not exist"),
      changes: [],
      skipped: [],
    };
  }

  let runtimeSource: string;
  try {
    runtimeSource = await deps.readFile(d3dxUserPath, "utf-8");
  } catch (error) {
    return {
      ...failure("internal-error", `Failed to read d3dx_user.ini: ${String(error)}`),
      changes: [],
      skipped: [],
    };
  }

  const extracted = extractRuntimeStates(modName, runtimeSource, deps);
  const changes: SyncedToggleChange[] = [];
  const skipped = [...extracted.skipped];
  const byFile = new Map<string, { iniPath: string; states: RuntimeState[] }>();
  for (const state of extracted.states) {
    const key = state.iniPath.toLowerCase();
    const group = byFile.get(key) ?? { iniPath: state.iniPath, states: [] };
    group.states.push(state);
    byFile.set(key, group);
  }

  for (const { iniPath, states } of byFile.values()) {
    const target = await resolveIniTarget(root, iniPath, deps);
    if (!target.ok) {
      const reason = target.code === "ini-not-found" ? ("ini-not-found" as const) : ("invalid-path" as const);
      skipped.push(
        ...states.map((state) => ({
          iniPath,
          variableName: state.variableName,
          reason,
          message: target.message,
        }))
      );
      continue;
    }

    const result = await withFileLock(target.fullPath, async () => {
      const source = await deps.readFile(target.fullPath, "utf-8");
      const context = threeDMigotoParser.parse(source);
      if (context.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
        skipped.push(
          ...states.map((state) => ({
            iniPath: target.iniPath,
            variableName: state.variableName,
            reason: "parse-error" as const,
            message: `INI file "${target.iniPath}" contains blocking parse errors`,
          }))
        );
        return undefined;
      }

      const edits: ThreeDMigotoTextEdit[] = [];
      const pendingChanges: SyncedToggleChange[] = [];
      for (const state of states) {
        const declarations = context.persistentVariableDeclarations.filter(
          (variable) => variable.normalizedName === state.variableName.toLowerCase()
        );
        if (declarations.length === 0) {
          skipped.push({
            iniPath: target.iniPath,
            variableName: state.variableName,
            reason: "variable-not-found",
            message: `Persistent variable "${state.variableName}" was not found`,
          });
          continue;
        }
        if (declarations.length > 1) {
          skipped.push({
            iniPath: target.iniPath,
            variableName: state.variableName,
            reason: "variable-ambiguous",
            message: `Persistent variable "${state.variableName}" has multiple declarations`,
          });
          continue;
        }

        const declaration = declarations[0];
        if (numericExpressionValue(declaration.expression) === state.numericValue) continue;
        edits.push(createThreeDMigotoPropertyValueEdit(declaration.line, state.rawValue));
        pendingChanges.push({
          iniPath: target.iniPath,
          variableName: declaration.name,
          previousValue: declaration.rawValue,
          newValue: state.rawValue,
        });
      }

      if (edits.length === 0) return undefined;
      const nextSource = applyThreeDMigotoTextEdits(source, edits);
      if (hasBlockingDiagnostics(nextSource)) {
        skipped.push(
          ...pendingChanges.map((change) => ({
            iniPath: change.iniPath,
            variableName: change.variableName,
            reason: "parse-error" as const,
            message: "Synchronized values did not pass parser verification",
          }))
        );
        return undefined;
      }

      const writeFailure = await safelyReplaceSource(target.fullPath, source, nextSource, deps);
      if (writeFailure) return writeFailure;
      changes.push(...pendingChanges);
      return undefined;
    });

    if (result?.ok === false) return { ...result, changes, skipped };
  }

  return { ok: true, changes, skipped };
};
