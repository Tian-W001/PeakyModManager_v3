import "./setup";
import { app, shell, BrowserWindow, protocol } from "electron";
import { join } from "path";
import icon from "../../resources/icon.png?asset";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import log from "electron-log/main";

import "./handlers/libraryHandler";
import {
  explorerImportProtocolScheme,
  handleExplorerImport,
  registerExplorerImportProtocol,
} from "./protocols/explorerImportProtocol";
import { registerModImageProtocol, modImageProtocolScheme } from "./protocols/modImageProtocol";

const installExtensions = async () => {
  const installer = await import("electron-devtools-installer");
  const extensions = ["REACT_DEVELOPER_TOOLS", "REDUX_DEVTOOLS"];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  return installer
    .default(
      extensions.map((name) => installer[name]),
      { forceDownload }
    )
    .catch(console.log);
};

let mainWindow: BrowserWindow | null = null;

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
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

  //mainWindow.webContents.openDevTools();

  mainWindow.on("ready-to-show", () => {
    mainWindow!.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Register protocol handler after window is created
  registerExplorerImportProtocol(mainWindow);
  registerModImageProtocol();
};

protocol.registerSchemesAsPrivileged([explorerImportProtocolScheme, modImageProtocolScheme]);

const gotlock = app.requestSingleInstanceLock();
if (!gotlock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((a) => a.startsWith("peakymodmanager://"));
    log.info("Second instance with URL:", url);
    if (url && mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      handleExplorerImport(url, mainWindow);
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.peaky.peakymodmanager");

  // Install devtools extensions in dev mode
  if (is.dev && !app.isPackaged) {
    await installExtensions();
  }

  // Set as default protocol client for peakymodmanager://
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("peakymodmanager", process.execPath, [join(process.cwd(), process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient("peakymodmanager");
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
