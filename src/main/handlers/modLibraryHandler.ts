import path from "path";
import fs from "fs-extra";
import { ipcMain } from "electron";
import { processModInfo } from "./modImportHandler";
import { getLibraryPath, getTargetPath } from "../services/storeService";

const loadLibrary = async () => {
  const libraryPath = getLibraryPath();
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return [];

  try {
    const entries = await fs.readdir(libraryPath, { withFileTypes: true });
    const modFolders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    const modInfosWithTime = await Promise.all(
      modFolders.map(async (folder) => {
        try {
          const modInfo = await processModInfo(path.join(libraryPath, folder));
          const stats = await fs.stat(path.join(libraryPath, folder, "modinfo.json"));
          return { modInfo, mtime: stats.mtime.getTime() };
        } catch (error) {
          console.error(`Error processing mod in folder ${folder}:`, error);
          return null;
        }
      })
    );

    return modInfosWithTime
      .filter((item) => item !== null)
      .sort((a, b) => b.mtime - a.mtime)
      .map((item) => item.modInfo);
  } catch (error) {
    console.error("Error loading library:", error);
    return [];
  }
};

ipcMain.handle("load-library", async () => {
  return await loadLibrary();
});

ipcMain.handle("delete-mod", async (_event, modName: string) => {
  const libraryPath = getLibraryPath();
  const targetPath = getTargetPath();
  if (!libraryPath || !targetPath || !(await fs.pathExists(libraryPath)) || !(await fs.pathExists(targetPath)))
    return false;

  const modPath = path.join(libraryPath, modName);
  const modLinkPath = path.join(targetPath, modName);
  try {
    await fs.remove(modPath);
    await fs.remove(modLinkPath);
    return true;
  } catch (error) {
    console.error("Error deleting mod:", error);
    return false;
  }
});
