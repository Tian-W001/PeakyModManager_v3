import path from "path";
import fs from "fs-extra";
import { ipcMain } from "electron";
import { getLibraryPath, getTargetPath } from "../services/storeService";

ipcMain.handle("apply-mods", async (_event, changes: Record<string, boolean>) => {
  const libraryPath = getLibraryPath();
  const targetPath = getTargetPath();
  if (!libraryPath || !targetPath || !(await fs.pathExists(libraryPath)) || !(await fs.pathExists(targetPath))) {
    console.error("Library path or Target path is not set.");
    return { success: false, successfulMods: [] };
  }

  let success: boolean = true;
  const successfulMods: string[] = [];
  for (const modName in changes) {
    const enable = changes[modName];
    const sourcePath = path.join(libraryPath, modName);
    const destPath = path.join(targetPath, modName);
    try {
      if (enable) {
        await fs.remove(destPath);
        await fs.ensureSymlink(sourcePath, destPath, "junction");
      } else {
        await fs.remove(destPath);
      }
      successfulMods.push(modName);
    } catch (error) {
      console.error(`Failed to apply change for mod ${modName}:`, error);
      success = false;
    }
  }

  return { success, successfulMods };
});
