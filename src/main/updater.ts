import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import { ipcMain } from "electron";

ipcMain.handle("check-for-updates", async (): Promise<boolean | null> => {
  const result = await autoUpdater.checkForUpdates();
  return result?.isUpdateAvailable ?? null;
});

export const setupAutoUpdater = () => {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
  });
  autoUpdater.on("update-available", (info) => {
    log.info("Update available.", info);
  });
  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available.", info);
  });
  autoUpdater.checkForUpdatesAndNotify();
};
