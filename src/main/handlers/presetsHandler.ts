import { ipcMain } from "electron/main";
import store from "../store";
import path from "path";
import fs from "fs-extra";

const backupFileBaseName = "Presets_Backup";

ipcMain.handle("backup-presets", async (_event, backupData: Record<string, string[]>) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return false;

  // create timestamp yyyy-mm-dd-hh-mm-ss
  const timestamp = new Date().toISOString().replace(/T/, "-").replace(/:/g, "-").split(".")[0];

  const backupFilePath = path.join(libraryPath, `${backupFileBaseName}_${timestamp}.json`);
  try {
    await fs.writeJson(backupFilePath, backupData, { spaces: 2 });
    return true;
  } catch (error) {
    console.error("Error backing up presets:", error);
    return false;
  }
});

ipcMain.handle("restore-presets", async (_event, backupFilePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

  try {
    if (await fs.pathExists(backupFilePath)) {
      return (await fs.readJson(backupFilePath)) as Record<string, string[]>;
    }
    return null;
  } catch (error) {
    console.error("Error restoring presets:", error);
    return null;
  }
});
