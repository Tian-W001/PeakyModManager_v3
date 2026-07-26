export type ConfigErrorCode =
  | "library-not-configured"
  | "d3dx-user-not-configured"
  | "mod-not-found"
  | "invalid-path"
  | "ini-not-found"
  | "invalid-request"
  | "parse-error"
  | "target-not-found"
  | "target-ambiguous"
  | "conflict"
  | "write-failed"
  | "internal-error";

export interface ConfigOperationFailure {
  ok: false;
  code: ConfigErrorCode;
  message: string;
}

export interface ChangeKeyBindingRequest {
  modName: string;
  iniPath: string;
  keyBindingId: string;
  keys: string[];
  backKeys?: string[];
}

export interface KeyBindingSnapshot {
  keys: string[];
  backKeys: string[];
}

export interface ChangeToggleStateRequest {
  modName: string;
  iniPath: string;
  variableName: string;
  value: number;
}

export interface ToggleStateSnapshot {
  variableName: string;
  value: string;
}

export type ConfigMutationResult<T> =
  | {
      ok: true;
      changed: boolean;
      modName: string;
      iniPath: string;
      before: T;
      after: T;
    }
  | ConfigOperationFailure;

export type ChangeKeyBindingResult = ConfigMutationResult<KeyBindingSnapshot>;
export type ChangeToggleStateResult = ConfigMutationResult<ToggleStateSnapshot>;

export interface SyncedToggleChange {
  iniPath: string;
  variableName: string;
  previousValue: string;
  newValue: string;
}

export type ToggleSyncSkipReason =
  | "invalid-state"
  | "invalid-path"
  | "ini-not-found"
  | "variable-not-found"
  | "variable-ambiguous"
  | "parse-error"
  | "conflict";

export interface SkippedToggleState {
  iniPath: string;
  variableName: string;
  reason: ToggleSyncSkipReason;
  message: string;
}

export type SyncTogglesResult =
  | {
      ok: true;
      changes: SyncedToggleChange[];
      skipped: SkippedToggleState[];
    }
  | (ConfigOperationFailure & {
      changes: SyncedToggleChange[];
      skipped: SkippedToggleState[];
    });
