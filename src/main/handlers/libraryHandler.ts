import path from "path";
import fs from "fs-extra";
import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import store from "../store";
import { defaultModInfo, ModInfo } from "../../types/modInfo";
import { Character } from "../../types/character";

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

const createModInfoFile: (modInfoPath: string) => ModInfo = (modInfoPath) => {
  const modInfo: ModInfo = {
    name: path.basename(modInfoPath),
    modType: "Unknown",
    description: "",
    source: "",
    coverImage: "",
  };
  fs.writeFileSync(modInfoPath, JSON.stringify(modInfo, null, 2));
  return modInfo;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateAndFixModInfo = (modInfo: any, modInfoPath: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fixedModInfo: any = { ...defaultModInfo };
  for (const key in modInfo) {
    if (key in fixedModInfo) {
      fixedModInfo[key] = modInfo[key];
    }
  }
  if (fixedModInfo.modType === "Character") {
    if (!fixedModInfo.character) {
      fixedModInfo.character = "Unknown" as Character;
    }
  }
  fs.writeFileSync(modInfoPath, JSON.stringify(fixedModInfo, null, 2));
  return fixedModInfo as ModInfo;
};

const loadLibrary: (libraryPath: string) => Promise<ModInfo[]> = async (libraryPath: string) => {
  // Read every folder in the given library path
  // For each folder, check if it contains a modinfo.json file
  // If it does, read the modinfo.json file and store the mod information, and return an array of mod information objects
  if (!libraryPath || !fs.existsSync(libraryPath)) {
    return [];
  }

  try {
    const modFolders = (await fs.readdir(libraryPath)).filter((file) => fs.statSync(path.join(libraryPath, file)).isDirectory());

    const modInfos: ModInfo[] = modFolders.map((folder) => {
      const modInfoPath = path.join(libraryPath, folder, "modinfo.json");
      if (fs.existsSync(modInfoPath)) {
        const modInfo = JSON.parse(fs.readFileSync(modInfoPath, "utf-8"));
        //need to validate modInfo here
        return validateAndFixModInfo(modInfo, modInfoPath);
      } else {
        return createModInfoFile(path.join(libraryPath, folder));
      }
    });
    store.set("library", modInfos);
    return modInfos;
  } catch (error) {
    console.error("Error loading library:", error);
    return [];
  }
};

ipcMain.handle("open-mod-folder", async (_event, modPath: string) => {
  const fullPath = path.resolve(modPath);
  await shell.openPath(fullPath);
});
