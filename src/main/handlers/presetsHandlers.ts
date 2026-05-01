import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { backupPresets, restorePresets } from "../domain/presets";
import { getLibraryPath } from "../services/storeService";
import { PresetsDeps } from "../domain/presets";

const deps: PresetsDeps = {
  getLibraryPath,
  pathExists: (p: string) => fs.pathExists(p),
  pathJoin: (...segments: string[]) => path.join(...segments),
  writeJson: (p: string, data: unknown) => fs.writeJson(p, data, { spaces: 2 }),
  readJson: (p: string) => fs.readJson(p),
  currentTimestamp: () => new Date().toISOString().replace(/T/, "-").replace(/:/g, "-").split(".")[0],
};

export const registerPresetsHandlers = () => {
  ipcMain.handle("backup-presets", async (_event, backupData: Record<string, string[]>) =>
    backupPresets(backupData, deps)
  );
  ipcMain.handle("restore-presets", async (_event, backupFilePath: string) => restorePresets(backupFilePath, deps));
};
