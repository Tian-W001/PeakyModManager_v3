import { BrowserWindow, shell } from "electron";
import { join } from "path";
import icon from "../../resources/icon.png?asset";
import { is } from "@electron-toolkit/utils";
import { setMainWindow } from "./services/windowService";
import { setupAutoUpdater } from "./updater";
import { registerExplorerImportProtocol } from "./protocols/explorerImportProtocol";
import { registerModImageProtocol } from "./protocols/modImageProtocol";

export const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    title: "PeakyModManager_v3",
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: process.env.NODE_ENV === "development",
    },
  });

  setMainWindow(mainWindow);

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    setupAutoUpdater();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  registerExplorerImportProtocol();
  registerModImageProtocol();
};
