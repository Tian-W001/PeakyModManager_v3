import { app } from "electron";
import { initialize, trackEvent } from "@aptabase/electron/main";
import log from "electron-log/main";
import { getAnalyticsEnabled } from "./storeService";

// Call before app.whenReady(): the SDK finishes initialization after Electron is ready.
export const trackAppStartup = async () => {
  if (!app.isPackaged) return;

  try {
    if (!getAnalyticsEnabled()) return;

    await initialize("A-US-5250663172");
    await trackEvent("app_started");
  } catch (error) {
    log.error("Failed to send app startup analytics:", error);
  }
};
