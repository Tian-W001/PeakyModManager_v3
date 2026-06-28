import "./setup";
import { app, BrowserWindow, protocol } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { explorerImportProtocolScheme, registerExplorerImportProtocol } from "./protocols/explorerImportProtocol";
import { modImageProtocolScheme } from "./protocols/modImageProtocol";
import { ipcMain } from "electron/main";
import { getMainWindow } from "./services/windowService";
import { createWindow } from "./window";
import installExtensions from "./extensions";

import "./handlers";

protocol.registerSchemesAsPrivileged([explorerImportProtocolScheme, modImageProtocolScheme]);

const gotlock = app.requestSingleInstanceLock();
if (!gotlock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.peaky.peakymodmanager");

  if (is.dev && !app.isPackaged) {
    await installExtensions();
  }

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("peakymodmanager", process.execPath, [join(process.cwd(), process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient("peakymodmanager");
  }

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerExplorerImportProtocol();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});
