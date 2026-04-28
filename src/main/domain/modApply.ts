export interface ModApplyDeps {
  getLibraryPath: () => string | null;
  getTargetPath: () => string | null;
  pathExists: (p: string) => Promise<boolean>;
  remove: (p: string) => Promise<void>;
  ensureSymlink: (src: string, dest: string, type: string) => Promise<void>;
  pathJoin: (...segments: string[]) => string;
}

export interface ApplyResult {
  success: boolean;
  successfulMods: string[];
}

export const applyMods = async (changes: Record<string, boolean>, deps: ModApplyDeps): Promise<ApplyResult> => {
  const libraryPath = deps.getLibraryPath();
  const targetPath = deps.getTargetPath();
  if (!libraryPath || !targetPath || !(await deps.pathExists(libraryPath)) || !(await deps.pathExists(targetPath))) {
    return { success: false, successfulMods: [] };
  }

  let success: boolean = true;
  const successfulMods: string[] = [];
  for (const modName in changes) {
    const enable = changes[modName];
    const sourcePath = deps.pathJoin(libraryPath, modName);
    const destPath = deps.pathJoin(targetPath, modName);
    try {
      if (enable) {
        await deps.remove(destPath);
        await deps.ensureSymlink(sourcePath, destPath, "junction");
      } else {
        await deps.remove(destPath);
      }
      successfulMods.push(modName);
    } catch {
      success = false;
    }
  }

  return { success, successfulMods };
};
