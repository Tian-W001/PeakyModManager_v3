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

ipcMain.handle("select-cover", async (_event, modName: string) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  const libraryPath = store.get("libraryPath", null) as string | null;
  let defaultPath;
  if (libraryPath && modName) {
    defaultPath = path.join(libraryPath, modName);
  }

  const result = await dialog.showOpenDialog(win, {
    defaultPath,
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg", "webp", "gif"] }],
    title: "Select Cover Image",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("import-mod-cover", async (_event, modName: string, imagePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return null;

  const modPath = path.join(libraryPath, modName);

  // Check if the image is already inside the mod folder
  const relativePath = path.relative(modPath, imagePath);
  const isInside = !relativePath.startsWith("..") && !path.isAbsolute(relativePath);

  if (isInside) {
    return relativePath;
  }

  const ext = path.extname(imagePath);
  const newCoverName = `preview${ext}`;
  const destPath = path.join(modPath, newCoverName);

  try {
    await fs.copy(imagePath, destPath);
    return newCoverName;
  } catch (error) {
    console.error("Error importing mod cover:", error);
    return null;
  }
});

ipcMain.handle("import-mod", async (_event, sourcePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return false;

  try {
    const stats = await fs.stat(sourcePath);
    if (!stats.isDirectory()) {
      console.error("Imported path is not a directory:", sourcePath);
      return false;
    }

    const modName = path.basename(sourcePath);
    const destPath = path.join(libraryPath, modName);
    await fs.copy(sourcePath, destPath);

    // Check if modinfo.json exists
    const modInfoPath = path.join(destPath, "modinfo.json");
    if (fs.existsSync(modInfoPath)) {
      const modInfo = JSON.parse(fs.readFileSync(modInfoPath, "utf-8"));
      const fixedModInfo = validateAndFixModInfo(modInfo);
      fs.writeFileSync(modInfoPath, JSON.stringify(fixedModInfo, null, 2));
      return fixedModInfo;
    } else {
      return createModInfoFile(destPath);
    }
  } catch (error) {
    console.error("Error importing mod:", error);
    return false;
  }
});

ipcMain.handle("delete-mod", async (_event, modName: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return false;

  const modPath = path.join(libraryPath, modName);
  try {
    await fs.remove(modPath);
    return true;
  } catch (error) {
    console.error("Error deleting mod:", error);
    return false;
  }
});

ipcMain.handle("clear-target-path", async () => {
  // remove all symlinks ONLY
  const targetPath = store.get("targetPath", null) as string | null;
  if (!targetPath) return;
  try {
    const files = await fs.readdir(targetPath);
    for (const file of files) {
      const filePath = path.join(targetPath, file);
      const stats = await fs.lstat(filePath);
      if (stats.isSymbolicLink()) {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    console.error("Error clearing target path:", error);
  }
});

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

const createModInfoFile = (modPath: string) => {
  const modInfo: ModInfo = {
    name: path.basename(modPath),
    modType: "Unknown",
    description: "",
    source: "",
    coverImage: "",
  };
  const modInfoPath = path.join(modPath, "modinfo.json");
  fs.writeFileSync(modInfoPath, JSON.stringify(modInfo, null, 2));
  return modInfo;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateAndFixModInfo = (modInfo: any) => {
  const fixedModInfo: ModInfo = { ...defaultModInfo };
  for (const key in modInfo) {
    if (key in fixedModInfo) {
      fixedModInfo[key] = modInfo[key];
    }
  }
  if (fixedModInfo.modType === "Character") {
    if (modInfo.character) {
      fixedModInfo.character = modInfo.character as Character;
    } else {
      fixedModInfo.character = "Unknown";
    }
  }
  return fixedModInfo;
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
        const fixedModInfo = validateAndFixModInfo(modInfo);
        fs.writeFileSync(modInfoPath, JSON.stringify(fixedModInfo, null, 2));
        return fixedModInfo;
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

ipcMain.handle("open-mod-folder", async (_event, modName?: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return;
  const fullPath = modName ? path.resolve(libraryPath, modName) : libraryPath;
  await shell.openPath(fullPath);
});

ipcMain.handle("autofill-mod-info", async (_event, modName: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return null;

  const modPath = path.join(libraryPath, modName);
  if (!fs.existsSync(modPath)) return null;

  let description = "";
  let coverImage = "";

  try {
    const files = await fs.readdir(modPath);

    // Find readme
    const readmeFile = files.find((file) => file.toLowerCase().includes("readme"));
    if (readmeFile) {
      const readmePath = path.join(modPath, readmeFile);
      const stats = await fs.stat(readmePath);
      if (stats.isFile()) {
        description = await fs.readFile(readmePath, "utf-8");
      }
    }

    // Find cover image
    const imageExtensions = [".jpg", ".png", ".gif", ".webp", ".jpeg"];
    const imageFiles = files.filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));

    if (imageFiles.length > 0) {
      const previewImage = imageFiles.find((file) => path.parse(file).name.toLowerCase() === "preview");
      coverImage = previewImage || imageFiles[0];
    }
  } catch (error) {
    console.error("Error autofilling mod info:", error);
  }

  return { description: description || null, coverImage: coverImage || null };
});

ipcMain.handle("apply-mods", async (_event, changes: Record<string, boolean>) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  const targetPath = store.get("targetPath", null) as string | null;

  if (!libraryPath || !targetPath) {
    console.error("Library path or Target path is not set.");
    return;
  }

  for (const modName in changes) {
    const enable = changes[modName];
    const sourcePath = path.join(libraryPath, modName);
    const destPath = path.join(targetPath, modName);

    try {
      if (enable) {
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
