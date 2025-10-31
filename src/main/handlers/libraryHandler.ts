import path from "path";
import fs from "fs-extra";
import { BrowserWindow, dialog, ipcMain } from "electron";
import store from "../store";
import { ModInfo } from "../../types/modInfo";

ipcMain.handle("select-library-path", async () => {
  // Open a dialog to select a folder
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "Select Library Path",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("load-library", async (_event, libraryPath: string) => {
  const mods = await loadLibrary(libraryPath);
  store.set("library", mods);
  return mods;
});

ipcMain.handle("read-library", async () => {
  const mods: ModInfo[] = store.get("library", []) as ModInfo[];
  return mods;
});

const createModInfoFile: (modPath: string) => ModInfo = (modPath) => {
  const modInfo: ModInfo = {
    name: path.basename(modPath),
    description: "",
    source: "",
    coverImage: "",
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(modPath, "modinfo.json"), JSON.stringify(modInfo, null, 2));
  return modInfo;
};

const loadLibrary: (libraryPath: string) => Promise<ModInfo[]> = async (libraryPath: string) => {
  // Read every folder in the given library path
  // For each folder, check if it contains a modinfo.json file
  // If it does, read the modinfo.json file and store the mod information, and return an array of mod information objects
  try {
    const modFolders = (await fs.readdir(libraryPath)).filter((file) => fs.statSync(path.join(libraryPath, file)).isDirectory());

    const modInfos: ModInfo[] = modFolders.map((folder) => {
      if (fs.existsSync(path.join(libraryPath, folder, "modinfo.json"))) {
        const modInfoRaw = fs.readFileSync(path.join(libraryPath, folder, "modinfo.json"), "utf-8");
        const modInfo: ModInfo = JSON.parse(modInfoRaw);
        return modInfo;
      } else {
        return createModInfoFile(path.join(libraryPath, folder));
      }
    });
    return modInfos;
  } catch (error) {
    console.error("Error loading library:", error);
    return [];
  }
};
