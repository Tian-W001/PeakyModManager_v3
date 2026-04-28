import { ModInfo } from "../../shared/modInfo";
import { validateModInfo, createModInfoFile } from "./modInfo";

export interface ModLibraryDeps {
  getLibraryPath: () => string | null;
  getTargetPath: () => string | null;
  pathExists: (p: string) => Promise<boolean>;
  readdir: (p: string) => Promise<{ name: string; isDirectory: () => boolean }[]>;
  stat: (p: string) => Promise<{ mtime: Date }>;
  remove: (p: string) => Promise<void>;
  pathJoin: (...segments: string[]) => string;
  readFile: (p: string, encoding: string) => Promise<string>;
  writeJson: (p: string, data: unknown) => Promise<void>;
  logError: (msg: string) => void;
}

export interface ModInfoWithTime {
  modInfo: ModInfo;
  mtime: number;
}

export const processModInfo = async (modPath: string, deps: ModLibraryDeps): Promise<ModInfo> => {
  const modInfoPath = deps.pathJoin(modPath, "modinfo.json");
  if (await deps.pathExists(modInfoPath)) {
    const modInfo = JSON.parse(await deps.readFile(modInfoPath, "utf-8"));
    const { valid, fixedModInfo } = validateModInfo(modInfo, modPath.split("/").pop() || modPath);
    if (!valid && fixedModInfo) {
      await deps.writeJson(modInfoPath, fixedModInfo);
    }
    return fixedModInfo;
  } else {
    return await createModInfoFile(modPath, deps);
  }
};

export const loadLibrary = async (deps: ModLibraryDeps): Promise<ModInfo[]> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) return [];

  try {
    const entries = await deps.readdir(libraryPath);
    const modFolders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    const modInfosWithTime = await Promise.all(
      modFolders.map(async (folder) => {
        try {
          const modInfo = await processModInfo(deps.pathJoin(libraryPath, folder), deps);
          const stats = await deps.stat(deps.pathJoin(libraryPath, folder, "modinfo.json"));
          return { modInfo, mtime: stats.mtime.getTime() };
        } catch (error) {
          deps.logError(`Error processing mod in folder ${folder}: ${error}`);
          return null;
        }
      })
    );

    return modInfosWithTime
      .filter((item): item is ModInfoWithTime => item !== null)
      .sort((a, b) => b.mtime - a.mtime)
      .map((item) => item.modInfo);
  } catch (error) {
    deps.logError(`Error loading library: ${error}`);
    return [];
  }
};

export const deleteMod = async (modName: string, deps: ModLibraryDeps): Promise<boolean> => {
  const libraryPath = deps.getLibraryPath();
  const targetPath = deps.getTargetPath();
  if (!libraryPath || !targetPath || !(await deps.pathExists(libraryPath)) || !(await deps.pathExists(targetPath)))
    return false;

  const modPath = deps.pathJoin(libraryPath, modName);
  const modLinkPath = deps.pathJoin(targetPath, modName);
  try {
    await deps.remove(modPath);
    await deps.remove(modLinkPath);
    return true;
  } catch (error) {
    deps.logError(`Error deleting mod: ${error}`);
    return false;
  }
};
