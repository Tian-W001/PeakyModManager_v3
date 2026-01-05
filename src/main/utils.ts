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

export const asarToAsarUnpacked = (path: string) => {
  if (!/app\.asar\.unpacked/.test(path)) {
    const pathUnpacked = path.replace(/app\.asar/, "app.asar.unpacked");

    if (fs.existsSync(pathUnpacked)) {
      path = pathUnpacked;
    }
  }
  return path;
};

export const getMainWindow = (): BrowserWindow | null => {
  return BrowserWindow.fromId(1);
};
