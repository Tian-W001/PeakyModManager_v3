import axios from "axios";
import { app, BrowserWindow, ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import sevenBin from "7zip-bin";
import Seven from "node-7z";
import log from "electron-log/main";
import { ModInfo } from "../../shared/modInfo";
import { Character } from "../../shared/character";

const zippedExtensions = [".zip", ".7z", ".rar", ".tar", ".gz"];
const isZippedFile = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  if (zippedExtensions.includes(ext)) {
    return true;
  }
  // recognize (.001, .part1, .r00, .z01)
  if (ext.match(/^\.(001|part1|r00|z01)$/)) {
    return true;
  }
  return false;
};

const asarToAsarUnpacked = (path: string) => {
  if (!/app\.asar\.unpacked/.test(path)) {
    const pathUnpacked = path.replace(/app\.asar/, "app.asar.unpacked");

    if (fs.existsSync(pathUnpacked)) {
      path = pathUnpacked;
    }
  }
  return path;
};

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

export const registerExplorerImportProtocol = (mainWindow: BrowserWindow) => {
  // make sure renderer is ready to receive IPC messages
  ipcMain.once("renderer-ready", () => {
    // Windows: check if launched with protocol URL
    const args = process.argv;
    log.info("Process args:", args);
    const protocolUrl = args.find((a) => a.startsWith("peakymodmanager://"));
    if (protocolUrl) {
      log.info("Found protocol URL in args:", protocolUrl);
      handleExplorerImport(protocolUrl, mainWindow);
    }
  });
  app.on("second-instance", (_event, argv) => {
    // check if launched with protocol URL
    const url = argv.find((a) => a.startsWith("peakymodmanager://"));
    log.info("Second instance with URL:", url);
    if (url && mainWindow) {
      handleExplorerImport(url, mainWindow);
    }
  });
};

const handleExplorerImport = async (url: string, mainWindow: BrowserWindow) => {
  log.info("Received URL:", url);
  try {
    const data = url.split("data=")[1];
    if (!data) {
      throw new Error("No data found in URL");
    }
    const base64Str = decodeURIComponent(data);
    const payload: ExplorerImportPayload = JSON.parse(Buffer.from(base64Str, "base64").toString("utf-8"));
    // sanitize mod name
    payload.modName = payload.modName
      .split("\n")[0]
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim();
    log.info("Parsed payload:", payload);
    await downloadMod(payload, mainWindow);
  } catch (error) {
    log.error("Error handling explorer import:", error);
    mainWindow.webContents.send("download-mod-error", {
      modName: "Unknown",
      error: error,
    });
  }
};

const downloadMod = async (payload: ExplorerImportPayload, mainWindow: BrowserWindow) => {
  log.info("Downloading mod:", payload.modName);

  const modDest = path.join(app.getPath("userData"), "Mods", payload.modName);
  await fs.ensureDir(modDest);

  // download all files
  mainWindow.webContents.send("downloading-mod", { modName: payload.modName });
  try {
    for (const link of payload.downloadLinks) {
      log.info(`Downloading from: ${link.href}`);
      const fileDest = path.join(modDest, link.filename);
      const res = await axios.get(link.href, {
        responseType: "arraybuffer",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            mainWindow.webContents.send("download-mod-progress", {
              modName: payload.modName,
              progress: progress,
            });
          }
        },
      });
      if (res.status !== 200) {
        throw new Error(`Failed to download ${payload.modName}`);
      }
      await fs.writeFile(fileDest, res.data);
    }
  } catch (error) {
    log.error("Error downloading mod files:", error);
    mainWindow.webContents.send("download-mod-error", {
      modName: payload.modName,
      error: "Error downloading mod: " + error,
    });
    return;
  }
  mainWindow.webContents.send("download-mod-finish", { modName: payload.modName });

  // extract the current folder
  mainWindow.webContents.send("unzipping-mod", { modName: payload.modName });
  try {
    const files = await fs.readdir(modDest);
    for (const file of files) {
      if (isZippedFile(file)) {
        const filePath = path.join(modDest, file);

        await new Promise<void>((resolve, reject) => {
          const stream = Seven.extractFull(filePath, modDest, {
            $bin: asarToAsarUnpacked(sevenBin.path7za),
            $progress: true,
          });
          stream.on("progress", (progress) => {
            mainWindow.webContents.send("unzip-mod-progress", {
              modName: payload.modName,
              progress: progress.percent,
            });
          });
          stream.on("end", () => {
            fs.removeSync(filePath);
            resolve();
          });
          stream.on("error", (error) => {
            log.error(`Failed to extract archive ${filePath}:`, error);
            reject(error);
          });
        });
      }
    }
  } catch (error) {
    log.error("Error extracting mod files:", error);
    mainWindow.webContents.send("unzip-mod-error", {
      modName: payload.modName,
      error: "Error extracting mod: " + error,
    });
    return;
  }
  mainWindow.webContents.send("unzip-mod-finish", { modName: payload.modName });

  // download cover image if provided
  if (payload.coverImageLink) {
    try {
      log.info(`Downloading cover image from: ${payload.coverImageLink}`);
      const coverDest = path.join(modDest, "cover.jpg");
      const res = await axios.get(payload.coverImageLink, { responseType: "arraybuffer" });
      if (res.status === 200) {
        await fs.writeFile(coverDest, res.data);
        mainWindow.webContents.send("download-cover-success", { modName: payload.modName });
      } else {
        throw new Error(`Failed to download cover image: ${res.statusText}`);
      }
    } catch (error) {
      mainWindow.webContents.send("download-cover-error", { modName: payload.modName, error: error });
    }
  }

  // generate modinfo.json
  const modInfoPath = path.join(modDest, "modinfo.json");
  const modInfo: ModInfo = payload.characterName
    ? {
        name: payload.modName,
        description: "",
        modType: "Character",
        character: payload.characterName,
        source: payload.modSource,
        coverImage: fs.existsSync(path.join(modDest, "cover.jpg")) ? "cover.jpg" : "",
      }
    : {
        name: payload.modName,
        description: "",
        modType: "Unknown",
        source: payload.modSource,
        coverImage: fs.existsSync(path.join(modDest, "cover.jpg")) ? "cover.jpg" : "",
      };
  fs.writeFileSync(modInfoPath, JSON.stringify(modInfo, null, 2));

  // notify renderer to import
  mainWindow.webContents.send("import-mod", modDest);
};
