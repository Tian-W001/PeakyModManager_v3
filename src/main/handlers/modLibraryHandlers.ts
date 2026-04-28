import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { loadLibrary, deleteMod } from "../domain/modLibrary";
import { getLibraryPath, getTargetPath } from "../services/storeService";
import { ModLibraryDeps } from "../domain/modLibrary";

const deps: ModLibraryDeps = {
  getLibraryPath,
  getTargetPath,
  pathExists: (p: string) => fs.pathExists(p),
  readdir: (p: string) => fs.readdir(p, { withFileTypes: true }),
  stat: async (p: string) => fs.stat(p),
  remove: (p: string) => fs.remove(p),
  pathJoin: (...segments: string[]) => path.join(...segments),
  readFile: async (p: string, encoding: string) => fs.readFile(p, encoding as BufferEncoding),
  writeJson: async (p: string, data: unknown) => fs.writeJson(p, data, { spaces: 2 }),
  logError: (msg: string) => console.error(msg),
};

export const registerLibraryHandlers = () => {
  ipcMain.handle("load-library", async () => loadLibrary(deps));
  ipcMain.handle("delete-mod", async (_event, modName: string) => deleteMod(modName, deps));
};
