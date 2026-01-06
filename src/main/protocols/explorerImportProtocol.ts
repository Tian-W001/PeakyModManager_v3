import axios from "axios";
import { app, ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import log from "electron-log/main";
import { ModInfo } from "../../shared/modInfo";
import { Character } from "../../shared/character";
import { isZippedFile, getMainWindow, unzipFile } from "../utils";

// Chrome Extention calls peakymodmanager://import?data=<base64(JSON)>

interface ExplorerImportPayload {
  modName: string;
  modSource: string;
  characterName: Character | null;
  coverImageLink: string;
  downloadLinks: {
    filename: string;
    href: string;
  }[];
}

export const explorerImportProtocolScheme: Electron.CustomScheme = {
  scheme: "peakymodmanager",
  privileges: {
    standard: true,
    secure: true,
  },
};

export const registerExplorerImportProtocol = () => {
  // make sure renderer is ready to receive IPC messages
  ipcMain.once("renderer-ready", () => {
    // Windows: check if launched with protocol URL
    const args = process.argv;
    log.info("Process args:", args);
    const url = args.find((a) => a.startsWith("peakymodmanager://"));
    if (url) {
      log.info("Found protocol URL in args:", url);
      handleExplorerImport(url);
    }
  });
  app.on("second-instance", (_event, argv) => {
    // check if launched with protocol URL
    const url = argv.find((a) => a.startsWith("peakymodmanager://"));
    log.info("Second instance with URL:", url);
    if (url) {
      handleExplorerImport(url);
    }
  });
};

const handleExplorerImport = async (url: string) => {
  log.info("Received URL:", url);
  let payload: ExplorerImportPayload;
  try {
    const data = url.split("data=")[1];
    if (!data) {
      throw new Error("No data found in URL");
    }
    const base64Str = decodeURIComponent(data);
    payload = JSON.parse(Buffer.from(base64Str, "base64").toString("utf-8"));
    // sanitize mod name
    payload.modName = payload.modName
      .split("\n")[0]
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim();
    log.info("Parsed payload:", payload);
  } catch (error) {
    log.error("Error handling explorer import:", error);
    getMainWindow()?.webContents.send("download-mod-error", {
      modName: "Unknown",
      error: error,
    });
    return;
  }

  let modDest: string;
  try {
    getMainWindow()?.webContents.send("downloading-mod", { modName: payload.modName });
    modDest = await downloadMod(payload, (progress) => {
      getMainWindow()?.webContents.send("download-mod-progress", {
        modName: payload.modName,
        progress: progress,
      });
    });
    getMainWindow()?.webContents.send("download-mod-finish", { modName: payload.modName });
  } catch (error) {
    log.error("Error downloading mod files:", error);
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
    log.error("Error extracting mod files:", error);
    getMainWindow()?.webContents.send("unzip-mod-error", {
      modName: payload.modName,
      error: "Error extracting mod: " + error,
    });
    return;
  }

  // download cover image if provided
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

  // generate modinfo.json
  const modInfoPath = path.join(modDest, "modinfo.json");
  const modInfo: ModInfo = payload.characterName
    ? {
        name: payload.modName,
        title: payload.modName,
        description: "",
        modType: "Character",
        character: payload.characterName,
        source: payload.modSource,
        coverImage: fs.existsSync(path.join(modDest, "cover.jpg")) ? "cover.jpg" : "",
      }
    : {
        name: payload.modName,
        title: payload.modName,
        description: "",
        modType: "Unknown",
        source: payload.modSource,
        coverImage: fs.existsSync(path.join(modDest, "cover.jpg")) ? "cover.jpg" : "",
      };
  fs.writeFileSync(modInfoPath, JSON.stringify(modInfo, null, 2));

  // notify renderer to import
  getMainWindow()?.webContents.send("import-mod", modDest);
};

const downloadMod = async (payload: ExplorerImportPayload, onProgress: (progress: number) => void) => {
  log.info("Downloading mod:", payload.modName);

  const modDest = path.join(app.getPath("userData"), "Mods", payload.modName);
  await fs.ensureDir(modDest);

  // download all files
  for (const link of payload.downloadLinks) {
    log.info(`Downloading from: ${link.href}`);
    const fileDest = path.join(modDest, link.filename);
    const res = await axios.get(link.href, {
      responseType: "arraybuffer",
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    if (res.status !== 200) {
      throw new Error(`Failed to download ${payload.modName}`);
    }
    await fs.writeFile(fileDest, res.data);
  }

  return modDest;
};

const unzipMod = async (modDest: string) => {
  const files = await fs.readdir(modDest);
  for (const file of files) {
    if (isZippedFile(file)) {
      const filePath = path.join(modDest, file);
      try {
        await unzipFile(filePath, modDest);
        fs.removeSync(filePath);
      } catch (error) {
        log.error(`Failed to extract archive ${filePath}:`, error);
        throw error;
      }
    }
  }
};
