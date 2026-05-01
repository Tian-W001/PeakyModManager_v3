import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { syncToggles } from "../domain/iniSync";
import { getLibraryPath, getD3dxUserPath } from "../services/storeService";
import { escapeRegExp } from "../utils";
import { IniSyncDeps } from "../domain/iniSync";

const deps: IniSyncDeps = {
  getD3dxUserPath,
  getLibraryPath,
  pathExists: (p: string) => fs.pathExists(p),
  readFile: (p: string, encoding: string) => fs.readFile(p, encoding as BufferEncoding),
  writeFile: (p: string, content: string, encoding: string) => fs.writeFile(p, content, encoding as BufferEncoding),
  pathJoin: (...segments: string[]) => path.join(...segments),
  escapeRegExp,
};

export const registerIniSyncHandlers = () => {
  ipcMain.handle("sync-toggles", async (_event, modName: string) => {
    try {
      return await syncToggles(modName, deps);
    } catch (error) {
      console.error(`Error syncing ini toggles for mod ${modName}:`, error);
      return null;
    }
  });
};
