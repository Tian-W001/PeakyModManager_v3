import { BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

export const setMainWindow = (win: BrowserWindow): void => {
  mainWindow = win;
};

export const getMainWindow = (): BrowserWindow | null => {
  return mainWindow;
};
