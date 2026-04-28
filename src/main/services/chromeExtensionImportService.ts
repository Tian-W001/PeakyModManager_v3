import axios from "axios";
import { app } from "electron";
import fs from "fs-extra";
import path from "path";
import log from "electron-log/main";
import { ModInfo } from "../../shared/modInfo";
import { Character } from "../../shared/character";
import { isZippedFile, unzipFile } from "../utils";
import { getMainWindow } from "../services/windowService";

export interface ExplorerImportPayload {
  modName: string;
  modSource: string;
  characterName: Character | null;
  coverImageLink: string;
  downloadLinks: {
    filename: string;
    href: string;
  }[];
}

export const downloadMod = async (payload: ExplorerImportPayload): Promise<string> => {
  log.info("Downloading mod:", payload.modName);
  const modDest = path.join(app.getPath("userData"), "Mods", payload.modName);

  await fs.ensureDir(modDest);
  for (const link of payload.downloadLinks) {
    log.info(`Downloading from: ${link.href}`);
    const fileDest = path.join(modDest, link.filename);
    const res = await axios.get(link.href, {
      responseType: "arraybuffer",
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          getMainWindow()?.webContents.send("download-mod-progress", {
            modName: payload.modName,
            progress: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          });
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

export const unzipMod = async (modDest: string) => {
  const files = await fs.readdir(modDest);
  for (const file of files) {
    if (isZippedFile(file)) {
      const filePath = path.join(modDest, file);
      try {
        await unzipFile(filePath, modDest);
        await fs.remove(filePath);
      } catch (error) {
        log.error(`Failed to extract archive ${filePath}:`, error);
        throw error;
      }
    }
  }
};

export const generateModInfo = (payload: ExplorerImportPayload, modDest: string): ModInfo => {
  const baseInfo = {
    name: payload.modName,
    title: payload.modName,
    description: "",
    source: payload.modSource,
    coverImage: fs.existsSync(path.join(modDest, "cover.jpg")) ? "cover.jpg" : "",
  };

  if (payload.characterName) {
    return {
      ...baseInfo,
      modType: "Character" as const,
      character: payload.characterName,
    };
  }

  return {
    ...baseInfo,
    modType: "Unknown" as const,
  };
};

export const parseExplorerImportUrl = (url: string): ExplorerImportPayload => {
  const data = url.split("data=")[1];
  if (!data) {
    throw new Error("No data found in URL");
  }
  const base64Str = decodeURIComponent(data);
  const payload: ExplorerImportPayload = JSON.parse(Buffer.from(base64Str, "base64").toString("utf-8"));
  payload.modName = payload.modName
    .split("\n")[0]
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim();
  log.info("Parsed payload:", payload);
  return payload;
};
