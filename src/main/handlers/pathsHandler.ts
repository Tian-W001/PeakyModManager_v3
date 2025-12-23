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
  console.log("Library path set to:", libraryPath);
});

ipcMain.handle("get-target-path", async () => {
  return store.get("targetPath", null) as string | null;
});

ipcMain.handle("set-target-path", async (_event, targetPath: string | null) => {
  store.set("targetPath", targetPath);
  console.log("Target path set to:", targetPath);
});

ipcMain.handle("open-mod-folder", async (_event, modName?: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return;
  const fullPath = modName ? path.resolve(libraryPath, modName) : libraryPath;
  await shell.openPath(fullPath);
});

ipcMain.handle("open-target-folder", async () => {
  const targetPath = store.get("targetPath", null) as string | null;
  if (!targetPath) return;
  await shell.openPath(targetPath);
});

ipcMain.handle("clear-target-path", async () => {
  // remove all symlinks ONLY
  const targetPath = store.get("targetPath", null) as string | null;
  if (!targetPath) return;
  try {
    const files = await fs.readdir(targetPath);
    for (const file of files) {
      const filePath = path.join(targetPath, file);
      const stats = await fs.lstat(filePath);
      if (stats.isSymbolicLink()) {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    console.error("Error clearing target path:", error);
  }
});
