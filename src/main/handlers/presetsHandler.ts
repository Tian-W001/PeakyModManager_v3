import { ipcMain } from "electron/main";
import store from "../store";
import path from "path";
import fs from "fs-extra";

ipcMain.handle("backup-presets", async (_event, backupData: Record<string, string[]>) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return false;

  const backupFilePath = path.join(libraryPath, "Presets_Backup.json");
  try {
    await fs.writeJson(backupFilePath, backupData, { spaces: 2 });
    return true;
  } catch (error) {
    console.error("Error backing up presets:", error);
    return false;
  }
});

ipcMain.handle("restore-presets", async () => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return null;

  const backupFilePath = path.join(libraryPath, "Presets_Backup.json");
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
