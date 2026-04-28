import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { applyMods } from "../domain/modApply";
import { getLibraryPath, getTargetPath } from "../services/storeService";
import { ModApplyDeps } from "../domain/modApply";

const deps: ModApplyDeps = {
  getLibraryPath,
  getTargetPath,
  pathExists: (p: string) => fs.pathExists(p),
  remove: (p: string) => fs.remove(p),
  ensureSymlink: (src: string, dest: string, type: string) => fs.ensureSymlink(src, dest, type as "junction"),
  pathJoin: (...segments: string[]) => path.join(...segments),
};

export const registerApplyHandlers = () => {
  ipcMain.handle("apply-mods", async (_event, changes: Record<string, boolean>) => applyMods(changes, deps));
};
