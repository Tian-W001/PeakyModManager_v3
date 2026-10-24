import { ipcMain } from "electron";
import { getAnalyticsEnabled, setAnalyticsEnabled } from "@main/services/storeService";

export const registerAnalyticsHandlers = () => {
  ipcMain.handle("get-analytics-enabled", () => getAnalyticsEnabled());
  ipcMain.handle("set-analytics-enabled", (_event, enabled: boolean) => setAnalyticsEnabled(enabled));
};
