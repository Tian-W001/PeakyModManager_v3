import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs-extra";
import { clearStore } from "../services/storeService";

export const registerClearSettingsHandler = () => {
  ipcMain.handle("clear-all-settings", async () => {
    try {
      clearStore();

      const modsCacheDir = path.join(app.getPath("userData"), "Mods");
      if (await fs.pathExists(modsCacheDir)) {
        await fs.remove(modsCacheDir);
      }

      return true;
    } catch (error) {
      console.error("Error clearing all settings:", error);
      return false;
    }
  });
};
