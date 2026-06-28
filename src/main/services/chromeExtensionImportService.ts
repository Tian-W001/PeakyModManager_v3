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

const sanitizeModName = (modName: unknown): string => {
  if (typeof modName !== "string") {
    return "";
  }
  return modName
    .split("\n")[0]
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim();
};

const isHttpUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const validateDownloadLinks = (downloadLinks: unknown): ExplorerImportPayload["downloadLinks"] => {
  if (!Array.isArray(downloadLinks) || downloadLinks.length === 0) {
    throw new Error("No download links found in payload");
  }

  return downloadLinks.map((link, index) => {
    if (
      !link ||
      typeof link !== "object" ||
      typeof (link as { filename?: unknown }).filename !== "string" ||
      typeof (link as { href?: unknown }).href !== "string"
    ) {
      throw new Error(`Invalid download link at index ${index}`);
    }

    const filename = path.basename((link as { filename: string }).filename).trim();
    const href = (link as { href: string }).href.trim();
    if (!filename) {
      throw new Error(`Invalid download filename at index ${index}`);
    }
    if (!isHttpUrl(href)) {
      throw new Error(`Invalid download URL at index ${index}`);
    }
    return { filename, href };
  });
};

export const downloadMod = async (payload: ExplorerImportPayload): Promise<string> => {
  log.info("Downloading mod:", payload.modName);
  const modDest = path.join(app.getPath("userData"), "Mods", payload.modName);

  await fs.emptyDir(modDest);
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

export const removeDownloadedMod = async (modName: string): Promise<void> => {
  if (!modName) return;
  await fs.remove(path.join(app.getPath("userData"), "Mods", modName));
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
  const data = new URL(url).searchParams.get("data");
  if (!data) {
    throw new Error("No data found in URL");
  }
  const base64Str = decodeURIComponent(data);
  const rawPayload = JSON.parse(Buffer.from(base64Str, "base64").toString("utf-8")) as Record<string, unknown>;
  const modName = sanitizeModName(rawPayload.modName);
  if (!modName) {
    throw new Error("Invalid mod name in payload");
  }

  const modSource = typeof rawPayload.modSource === "string" ? rawPayload.modSource : "";
  const coverImageLink = typeof rawPayload.coverImageLink === "string" ? rawPayload.coverImageLink : "";
  if (coverImageLink && !isHttpUrl(coverImageLink)) {
    throw new Error("Invalid cover image URL in payload");
  }

  const payload: ExplorerImportPayload = {
    modName,
    modSource,
    characterName: (typeof rawPayload.characterName === "string" ? rawPayload.characterName : null) as Character | null,
    coverImageLink,
    downloadLinks: validateDownloadLinks(rawPayload.downloadLinks),
  };
  log.info("Parsed payload:", payload);
  return payload;
};

export const getExplorerImportKey = (url: string, payload: ExplorerImportPayload): string => {
  return `${payload.modName}::${payload.modSource || url}`;
};
