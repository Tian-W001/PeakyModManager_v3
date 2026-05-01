import path from "path";
import fs from "fs-extra";
import { dialog, ipcMain } from "electron";
import { getLibraryPath } from "../services/storeService";
import { getMainWindow } from "../services/windowService";

export const registerDialogHandlers = () => {
  ipcMain.handle("select-path", async () => {
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      properties: ["openDirectory"],
      title: "Select Path",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      properties: ["openFile"],
      title: "Select File",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("select-cover", async (_event, modName: string) => {
    const libraryPath = getLibraryPath();
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
    const libraryPath = getLibraryPath();
    if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

    const result = await dialog.showOpenDialog(getMainWindow()!, {
      defaultPath: libraryPath,
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      title: "Select Backup File",
    });
    return result.canceled ? null : result.filePaths[0];
  });
};
