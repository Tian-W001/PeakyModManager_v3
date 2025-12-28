import path from "path";
import store from "../store";
import { BrowserWindow, dialog, ipcMain } from "electron/main";

ipcMain.handle("select-path", async () => {
  // Open a dialog to select a folder
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "Select Path",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-file", async () => {
  // Open a dialog to select a file
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    title: "Select File",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-cover", async (_event, modName: string) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  const libraryPath = store.get("libraryPath", null) as string | null;
  let defaultPath: string | undefined = undefined;
  if (libraryPath && modName) {
    defaultPath = path.join(libraryPath, modName);
  }

  const result = await dialog.showOpenDialog(win, {
    defaultPath,
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg", "webp", "gif"] }],
    title: "Select Cover Image",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-backup-file", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return null;

  const result = await dialog.showOpenDialog({
    defaultPath: libraryPath,
    properties: ["openFile"],
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    title: "Select Backup File",
  });
  return result.canceled ? null : result.filePaths[0];
});
