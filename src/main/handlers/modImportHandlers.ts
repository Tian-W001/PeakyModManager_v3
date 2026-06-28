import { app, ipcMain, net } from "electron";
import fs from "fs-extra";
import path from "path";
import mime from "mime-types";
import { importMod, importModCover } from "../domain/modImport";
import { processModInfo } from "../domain/modLibrary";
import { getLibraryPath } from "../services/storeService";
import { getMainWindow } from "../services/windowService";
import { isZippedFile, unzipFile } from "../utils";
import { ModImportDeps, ModCoverDeps } from "../domain/modImport";

const importDeps: ModImportDeps = {
  getLibraryPath,
  getTempModDir: (modName: string) => path.join(app.getPath("userData"), "Mods", modName),
  pathExists: (p: string) => fs.pathExists(p),
  stat: (p: string) => fs.stat(p),
  emptyDir: (p: string) => fs.emptyDir(p),
  copy: (src: string, dest: string) => fs.copy(src, dest),
  remove: (p: string) => fs.remove(p),
  rename: (oldPath: string, newPath: string) => fs.rename(oldPath, newPath),
  move: (src: string, dest: string, opts?: { overwrite: boolean }) => fs.move(src, dest, opts),
  readdir: (p: string) => fs.readdir(p, { withFileTypes: true }),
  isZippedFile,
  unzipFile,
  sendToRenderer: (channel: string, data: unknown) => getMainWindow()?.webContents.send(channel, data),
  onIpc: (channel: string, handler: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcMainEvent, ...args: unknown[]) => handler(...args);
    ipcMain.on(channel, listener);
    return () => ipcMain.removeListener(channel, listener);
  },
  overwriteTimeoutMs: 60_000,
  parsePathName: (p: string) => path.parse(path.basename(p)).name,
  pathJoin: (...segments: string[]) => path.join(...segments),
  log: (msg: string) => console.log(msg),
  readFile: (p: string, encoding: string) => fs.readFile(p, encoding),
  writeJson: async (p: string, data: unknown) => fs.writeJson(p, data, { spaces: 2 }),
  processModInfo,
};

const coverDeps: ModCoverDeps = {
  getLibraryPath,
  pathExists: (p: string) => fs.pathExists(p),
  pathJoin: (...segments: string[]) => path.join(...segments),
  pathRelative: (from: string, to: string) => path.relative(from, to),
  pathExtname: (p: string) => path.extname(p),
  pathIsAbsolute: (p: string) => path.isAbsolute(p),
  fetchUrl: async (url: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await net.fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  },
  extensionFromMime: (mimeType: string) => mime.extension(mimeType),
  writeFile: async (p: string, data: Buffer) => fs.writeFile(p, data),
  copyFile: async (src: string, dest: string) => fs.copy(src, dest),
  logError: (msg: string) => console.error(msg),
};

export const registerImportHandlers = () => {
  ipcMain.handle("import-mod", async (_event, sourcePath: string) => importMod(sourcePath, importDeps));
  ipcMain.handle("import-mod-cover", async (_event, modName: string, imageSource: string) =>
    importModCover(modName, imageSource, coverDeps)
  );
};
