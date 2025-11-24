import path from "path";
import fs from "fs-extra";
import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import store from "../store";
import { defaultModInfo, ModInfo } from "../../shared/modInfo";
import { Character } from "../../shared/character";

ipcMain.handle("select-path", async () => {
  // Open a dialog to select a folder
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "Select Path",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-file", async () => {
  // Open a dialog to select a file
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    title: "Select File",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-image", async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg", "webp"] }],
    title: "Select Cover Image",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("import-mod-cover", async (_event, modName: string, imagePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return null;

  const modPath = path.join(libraryPath, modName);
  const ext = path.extname(imagePath);
  const newCoverName = `cover${ext}`;
  const destPath = path.join(modPath, newCoverName);

  try {
    await fs.copy(imagePath, destPath);
    return newCoverName;
  } catch (error) {
    console.error("Error importing mod cover:", error);
    return null;
  }
});

ipcMain.handle("get-library-path", async () => {
  return store.get("libraryPath", null) as string | null;
});

ipcMain.handle("set-library-path", async (_event, libraryPath: string | null) => {
  store.set("libraryPath", libraryPath);
  console.log("Library path set to:", libraryPath);
});

ipcMain.handle("get-target-path", async () => {
  return store.get("targetPath", null) as string | null;
});

ipcMain.handle("set-target-path", async (_event, targetPath: string | null) => {
  store.set("targetPath", targetPath);
  console.log("Target path set to:", targetPath);
});

ipcMain.handle("load-library", async () => {
  const mods = await loadLibrary();
  return mods;
});

ipcMain.handle("edit-mod-info", async (_event, modName: string, newModInfo: ModInfo) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return;

  const modInfoPath = path.join(libraryPath, modName, "modinfo.json");
  if (fs.existsSync(modInfoPath)) {
    fs.writeFileSync(modInfoPath, JSON.stringify(newModInfo, null, 2));
  }
});

const createModInfoFile = (modInfoPath: string) => {
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

const loadLibrary = async () => {
  // Read every folder in library
  // For each folder, check if it contains a modinfo.json file
  // If it does, read the modinfo.json file, and return an array of mod information objects
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return [];

  try {
    const modFolders = (await fs.readdir(libraryPath)).filter((file) =>
      fs.statSync(path.join(libraryPath, file)).isDirectory()
    );

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
    return modInfos;
  } catch (error) {
    console.error("Error loading library:", error);
    return [];
  }
};

ipcMain.handle("open-mod-folder", async (_event, modName: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return;
  const fullPath = path.resolve(libraryPath, modName);
  await shell.openPath(fullPath);
});

ipcMain.handle("apply-mod-changes", async (_event, changes: { modName: string; enabled: boolean }[]) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  const targetPath = store.get("targetPath", null) as string | null;

  if (!libraryPath || !targetPath) {
    console.error("Library path or Target path is not set.");
    return;
  }

  for (const { modName, enabled } of changes) {
    const sourcePath = path.join(libraryPath, modName);
    const destPath = path.join(targetPath, modName);

    try {
      if (enabled) {
        if (fs.existsSync(sourcePath)) {
          await fs.ensureDir(targetPath);
          // Remove existing if it exists to ensure clean link
          if (fs.existsSync(destPath)) {
            await fs.remove(destPath);
          }
          await fs.ensureSymlink(sourcePath, destPath, "junction");
        }
      } else {
        if (fs.existsSync(destPath)) {
          await fs.remove(destPath);
        }
      }
    } catch (error) {
      console.error(`Failed to apply change for mod ${modName}:`, error);
    }
  }
});
