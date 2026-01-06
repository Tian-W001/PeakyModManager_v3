import path from "path";
import fs from "fs-extra";
import { BrowserWindow } from "electron";
import { createExtractorFromFile } from "node-unrar-js";
import sevenBin from "7zip-bin";
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
    if (ext === ".rar") {
      const extractor = await createExtractorFromFile({
        filepath: zippedPath,
        targetPath: destPath,
      });
      const { files } = extractor.extract();
      // Iterate over to ensure extraction happens
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _file of files) {
        // must iterate over the generator to trigger the extraction
      }
    } else if (zippedExtensions.filter((ext) => ext !== ".rar").includes(ext)) {
      await new Promise<void>((resolve, reject) => {
        const stream = Seven.extractFull(zippedPath, destPath, {
          $bin: asarToAsarUnpacked(sevenBin.path7za),
        });
        stream.on("end", () => resolve());
        stream.on("error", (err) => reject(err));
      });
    } else {
      throw new Error(`Unsupported file extension: ${ext}`);
    }
  } catch (error) {
    console.error(`Failed to unzip ${zippedPath}:`, error);
    throw error;
  }
};
