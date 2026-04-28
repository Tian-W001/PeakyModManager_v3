export interface PresetsDeps {
  getLibraryPath: () => string | null;
  pathExists: (p: string) => Promise<boolean>;
  pathJoin: (...segments: string[]) => string;
  writeJson: (p: string, data: unknown) => Promise<void>;
  readJson: (p: string) => Promise<unknown>;
  currentTimestamp: () => string;
}

const backupFileBaseName = "Presets_Backup";

export const backupPresets = async (backupData: Record<string, string[]>, deps: PresetsDeps): Promise<boolean> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) return false;

  const timestamp = deps.currentTimestamp();
  const backupFilePath = deps.pathJoin(libraryPath, `${backupFileBaseName}_${timestamp}.json`);
  try {
    await deps.writeJson(backupFilePath, backupData);
    return true;
  } catch {
    return false;
  }
};

export const restorePresets = async (
  backupFilePath: string,
  deps: PresetsDeps
): Promise<Record<string, string[]> | null> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) return null;

  try {
    if (await deps.pathExists(backupFilePath)) {
      return (await deps.readJson(backupFilePath)) as Record<string, string[]>;
    }
    return null;
  } catch {
    return null;
  }
};
