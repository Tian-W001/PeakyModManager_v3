import { ipcMain } from "electron";
import { shell } from "electron";
import path from "path";
import fs from "fs-extra";
import {
  getLibraryPath,
  setLibraryPath,
  getTargetPath,
  setTargetPath,
  getD3dxUserPath,
  setD3dxUserPath,
} from "../services/storeService";

export const registerPathsHandlers = () => {
  ipcMain.handle("get-library-path", async () => getLibraryPath());
  ipcMain.handle("set-library-path", async (_event, p: string | null) => setLibraryPath(p));
  ipcMain.handle("get-target-path", async () => getTargetPath());
  ipcMain.handle("set-target-path", async (_event, p: string | null) => setTargetPath(p));
  ipcMain.handle("get-d3dx-user-path", async () => getD3dxUserPath());
  ipcMain.handle("set-d3dx-user-path", async (_event, p: string | null) => setD3dxUserPath(p));

  ipcMain.handle("open-mod-folder", async (_event, modName?: string) => {
    const libraryPath = getLibraryPath();
    if (!libraryPath || !(await fs.pathExists(libraryPath))) return;
    const fullPath = modName ? path.join(libraryPath, modName) : libraryPath;
    await shell.openPath(fullPath);
  });

  ipcMain.handle("open-target-folder", async () => {
    const targetPath = getTargetPath();
    if (!targetPath || !(await fs.pathExists(targetPath))) return;
    await shell.openPath(targetPath);
  });

  ipcMain.handle("clear-target-path", async () => {
    const targetPath = getTargetPath();
    if (!targetPath || !(await fs.pathExists(targetPath))) return;
    try {
      const files = await fs.readdir(targetPath, { withFileTypes: true });
      for (const file of files) {
        if (!file.isSymbolicLink()) continue;
        await fs.remove(path.join(targetPath, file.name));
      }
    } catch (error) {
      console.error("Error clearing target path:", error);
    }
  });
};
