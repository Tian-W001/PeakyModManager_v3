import { app, ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import axios from "axios";
import log from "electron-log/main";
import { getMainWindow } from "../services/windowService";
import {
  downloadMod,
  unzipMod,
  generateModInfo,
  parseExplorerImportUrl,
  getExplorerImportKey,
  removeDownloadedMod,
} from "../services/chromeExtensionImportService";

export const explorerImportProtocolScheme: Electron.CustomScheme = {
  scheme: "peakymodmanager",
  privileges: {
    standard: true,
    secure: true,
  },
};

let registered = false;
const inFlightImports = new Set<string>();

export const registerExplorerImportProtocol = () => {
  if (registered) {
    return;
  }
  registered = true;

  ipcMain.once("renderer-ready", () => {
    const args = process.argv;
    log.info("Process args:", args);
    const url = args.find((a) => a.startsWith("peakymodmanager://"));
    if (url) {
      log.info("Found protocol URL in args:", url);
      handleExplorerImport(url);
    }
  });
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((a) => a.startsWith("peakymodmanager://"));
    log.info("Second instance with URL:", url);
    if (url) {
      handleExplorerImport(url);
    }
  });
};

const handleExplorerImport = async (url: string) => {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  log.info(`[${requestId}] Received URL:`, url);
  let payload;
  let importKey = url;
  try {
    payload = parseExplorerImportUrl(url);
    importKey = getExplorerImportKey(url, payload);
  } catch (error) {
    log.error(`[${requestId}] Error handling explorer import:`, error);
    getMainWindow()?.webContents.send("download-mod-error", {
      modName: "Unknown",
      error: error,
    });
    return;
  }

  if (inFlightImports.has(importKey)) {
    log.info(`[${requestId}] Skip duplicate explorer import:`, importKey);
    return;
  }
  inFlightImports.add(importKey);

  try {
    let modDest: string;
    try {
      getMainWindow()?.webContents.send("downloading-mod", { modName: payload.modName });
      modDest = await downloadMod(payload);
      getMainWindow()?.webContents.send("download-mod-finish", { modName: payload.modName });
    } catch (error) {
      log.error(`[${requestId}] Error downloading mod files:`, error);
      await removeDownloadedMod(payload.modName);
      getMainWindow()?.webContents.send("download-mod-error", {
        modName: payload.modName,
        error: "Error downloading mod: " + error,
      });
      return;
    }

    try {
      getMainWindow()?.webContents.send("unzipping-mod", { modName: payload.modName });
      await unzipMod(modDest);
      getMainWindow()?.webContents.send("unzip-mod-finish", { modName: payload.modName });
    } catch (error) {
      log.error(`[${requestId}] Error extracting mod files:`, error);
      await removeDownloadedMod(payload.modName);
      getMainWindow()?.webContents.send("unzip-mod-error", {
        modName: payload.modName,
        error: "Error extracting mod: " + error,
      });
      return;
    }

    if (payload.coverImageLink) {
      try {
        log.info(`Downloading cover image from: ${payload.coverImageLink}`);
        const coverDest = path.join(modDest, "cover.jpg");
        const res = await axios.get(payload.coverImageLink, { responseType: "arraybuffer" });
        if (res.status === 200) {
          await fs.writeFile(coverDest, res.data);
          getMainWindow()?.webContents.send("download-cover-success", { modName: payload.modName });
        } else {
          throw new Error(`Failed to download cover image: ${res.statusText}`);
        }
      } catch (error) {
        getMainWindow()?.webContents.send("download-cover-error", { modName: payload.modName, error: error });
      }
    }

    const modInfo = generateModInfo(payload, modDest);
    const modInfoPath = path.join(modDest, "modinfo.json");
    await fs.writeJson(modInfoPath, modInfo, { spaces: 2 });

    getMainWindow()?.webContents.send("import-mod", modDest);
  } finally {
    inFlightImports.delete(importKey);
  }
};
