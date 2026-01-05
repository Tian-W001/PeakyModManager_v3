import path from "path";
import fs from "fs-extra";
import { BrowserWindow } from "electron";

export const zippedExtensions = [".zip", ".7z", ".rar", ".tar", ".gz"];

export const isZippedFile = (filename: string) => {
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
