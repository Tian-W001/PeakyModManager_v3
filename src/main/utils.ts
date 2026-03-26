import path from "path";
import fs from "fs-extra";
import { BrowserWindow } from "electron";
import sevenBin from "7zip-bin-full";
import Seven from "node-7z";

export const zippedExtensions = [".zip", ".7z", ".rar", ".tar"];

export const isZippedFile = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  return zippedExtensions.includes(ext);
};

export const asarToAsarUnpacked = (filePath: string) => {
  let resultPath = filePath;
  if (!/app\.asar\.unpacked/.test(resultPath)) {
    const pathUnpacked = resultPath.replace(/app\.asar/, "app.asar.unpacked");

    if (fs.existsSync(pathUnpacked)) {
      resultPath = pathUnpacked;
    }
  }
  return resultPath;
};

export const getMainWindow = (): BrowserWindow | null => {
  return BrowserWindow.fromId(1);
};

export const unzipFile = async (zippedPath: string, destPath: string): Promise<void> => {
  const ext = path.extname(zippedPath).toLowerCase();
  await fs.ensureDir(destPath);

  try {
    if (zippedExtensions.includes(ext)) {
      await new Promise<void>((resolve, reject) => {
        const stream = Seven.extractFull(zippedPath, destPath, {
          $bin: asarToAsarUnpacked(sevenBin.path7z),
        });
        stream.on("end", () => resolve());
        stream.on("error", (err) => reject(err));
      });
    } else {
      throw new Error(`Unsupported file extension: ${ext}`);
    }
  } catch (error) {
    console.error(`Failed to unzip ${zippedPath}:`, error);
    await fs.remove(destPath); // Clean up any partially extracted files
    throw error;
  }
};

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
