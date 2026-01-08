import path from "path";
import store from "../store";
import { dialog, ipcMain } from "electron/main";
import { getMainWindow } from "../utils";
import fs from "fs-extra";

ipcMain.handle("select-path", async () => {
  // Open a dialog to select a folder
  const result = await dialog.showOpenDialog(getMainWindow()!, {
    properties: ["openDirectory"],
    title: "Select Path",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-file", async () => {
  // Open a dialog to select a file
  const result = await dialog.showOpenDialog(getMainWindow()!, {
    properties: ["openFile"],
    title: "Select File",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-cover", async (_event, modName: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

  const result = await dialog.showOpenDialog(getMainWindow()!, {
    defaultPath: path.join(libraryPath, modName),
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg", "webp", "gif"] }],
    title: "Select Cover Image",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-backup-file", async () => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

  const result = await dialog.showOpenDialog(getMainWindow()!, {
    defaultPath: libraryPath,
    properties: ["openFile"],
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    title: "Select Backup File",
  });
  return result.canceled ? null : result.filePaths[0];
});
