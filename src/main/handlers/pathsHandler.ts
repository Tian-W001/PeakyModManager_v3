import { ipcMain } from "electron/main";
import {
  getLibraryPath,
  setLibraryPath,
  getTargetPath,
  setTargetPath,
  getD3dxUserPath,
  setD3dxUserPath,
} from "../services/storeService";
import { shell } from "electron";
import path from "path";
import fs from "fs-extra";

ipcMain.handle("get-library-path", async () => {
  return getLibraryPath();
});

ipcMain.handle("set-library-path", async (_event, libraryPath: string | null) => {
  setLibraryPath(libraryPath);
});

ipcMain.handle("get-target-path", async () => {
  return getTargetPath();
});

ipcMain.handle("set-target-path", async (_event, targetPath: string | null) => {
  setTargetPath(targetPath);
});

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
      const filePath = path.join(targetPath, file.name);
      await fs.remove(filePath);
    }
  } catch (error) {
    console.error("Error clearing target path:", error);
  }
});

ipcMain.handle("get-d3dx-user-path", async () => {
  return getD3dxUserPath();
});

ipcMain.handle("set-d3dx-user-path", async (_event, d3dxUserPath: string | null) => {
  setD3dxUserPath(d3dxUserPath);
});
