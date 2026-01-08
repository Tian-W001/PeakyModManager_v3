import { ipcMain } from "electron/main";
import store from "../store";
import { shell } from "electron";
import path from "path";
import fs from "fs-extra";

ipcMain.handle("get-library-path", async () => {
  return store.get("libraryPath", null) as string | null;
});

ipcMain.handle("set-library-path", async (_event, libraryPath: string | null) => {
  store.set("libraryPath", libraryPath);
});

ipcMain.handle("get-target-path", async () => {
  return store.get("targetPath", null) as string | null;
});

ipcMain.handle("set-target-path", async (_event, targetPath: string | null) => {
  store.set("targetPath", targetPath);
});

ipcMain.handle("open-mod-folder", async (_event, modName?: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return;
  const fullPath = modName ? path.join(libraryPath, modName) : libraryPath;
  await shell.openPath(fullPath);
});

ipcMain.handle("open-target-folder", async () => {
  const targetPath = store.get("targetPath", null) as string | null;
  if (!targetPath || !(await fs.pathExists(targetPath))) return;
  await shell.openPath(targetPath);
});

ipcMain.handle("clear-target-path", async () => {
  // remove all symlinks ONLY
  const targetPath = store.get("targetPath", null) as string | null;
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
