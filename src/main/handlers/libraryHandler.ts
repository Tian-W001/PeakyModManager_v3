import path from "path";
import fs from "fs-extra";
import { app, ipcMain } from "electron";
import store from "../store";
import { ModInfo } from "../../shared/modInfo";
import { validateModInfo, createModInfoFile } from "./modInfoHandler";
import { isZippedFile, getMainWindow, unzipFile } from "../utils";

ipcMain.handle("on-startup", async () => {
  // clear <userData>/Mods folder on startup
  const modsPath = path.join(app.getPath("userData"), "Mods");
  try {
    if (await fs.pathExists(modsPath)) {
      await fs.emptyDir(modsPath);
    }
  } catch (error) {
    console.error("Error clearing Mods folder on startup:", error);
  }
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

const processModInfo = async (modPath: string): Promise<ModInfo> => {
  const modInfoPath = path.join(modPath, "modinfo.json");
  if (await fs.pathExists(modInfoPath)) {
    const modInfo = JSON.parse(await fs.readFile(modInfoPath, "utf-8"));
    const { valid, fixedModInfo } = validateModInfo(modInfo, path.basename(modPath));
    if (!valid && fixedModInfo) {
      await fs.writeJson(modInfoPath, fixedModInfo, { spaces: 2 });
    }
    return fixedModInfo!;
  } else {
    return await createModInfoFile(modPath);
  }
};

const unzipMod = async (zipPath: string, destPath: string) => {
  await fs.emptyDir(destPath);
  getMainWindow()?.webContents.send("unzipping-mod", { modName: path.basename(zipPath) });
  try {
    await unzipFile(zipPath, destPath);
  } catch (err) {
    getMainWindow()?.webContents.send("unzip-mod-error", { modName: path.basename(zipPath), error: String(err) });
    throw err;
  }
  getMainWindow()?.webContents.send("unzip-mod-finish", { modName: path.basename(zipPath) });
};

// Import a mod from the given source path (directory or archive) into the library
ipcMain.handle("import-mod", async (_event, sourcePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return false;

  let folderPath = sourcePath;
  const modName = path.parse(path.basename(sourcePath)).name;

  try {
    const stats = await fs.stat(sourcePath);
    if (stats.isFile() && isZippedFile(sourcePath)) {
      folderPath = path.join(app.getPath("userData"), "Mods", modName);
      await unzipMod(sourcePath, folderPath);
    } else if (!stats.isDirectory()) {
      return null;
    }
  } catch (error) {
    console.error("Error preparing mod source:", error);
    return null;
  }

  const destPath = path.join(libraryPath, modName);
  if (await fs.pathExists(destPath)) {
    console.log("Mod already exists in library: ", modName);
    return null;
  }

  try {
    await fs.copy(folderPath, destPath);
    return await processModInfo(destPath);
  } catch (error) {
    console.error("Error importing mod:", error);
    return null;
  }
});

ipcMain.handle("delete-mod", async (_event, modName: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  const targetPath = store.get("targetPath", null) as string | null;
  if (!libraryPath || !targetPath || !(await fs.pathExists(libraryPath)) || !(await fs.pathExists(targetPath)))
    return false;

  const modPath = path.join(libraryPath, modName);
  const modLinkPath = path.join(targetPath, modName);
  try {
    await fs.remove(modPath);
    await fs.remove(modLinkPath);
    return true;
  } catch (error) {
    console.error("Error deleting mod:", error);
    return false;
  }
});

ipcMain.handle("load-library", async () => {
  const mods = await loadLibrary();
  return mods;
});

const loadLibrary = async () => {
  // Read every folder in library
  // For each folder, check if it contains a modinfo.json file
  // If it does, read the modinfo.json file, and return an array of mod information objects
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return [];

  try {
    const entries = await fs.readdir(libraryPath, { withFileTypes: true });
    const modFolders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    const modInfos: ModInfo[] = await Promise.all(
      modFolders.map(async (folder) => {
        return await processModInfo(path.join(libraryPath, folder));
      })
    );
    return modInfos;
  } catch (error) {
    console.error("Error loading library:", error);
    return [];
  }
};

ipcMain.handle("apply-mods", async (_event, changes: Record<string, boolean>) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  const targetPath = store.get("targetPath", null) as string | null;
  if (!libraryPath || !targetPath || !(await fs.pathExists(libraryPath)) || !(await fs.pathExists(targetPath))) {
    console.error("Library path or Target path is not set.");
    return { success: false, successfulMods: [] }; // Return no successful mods
  }

  let success: boolean = true;
  const successfulMods: string[] = [];
  for (const modName in changes) {
    const enable = changes[modName];
    const sourcePath = path.join(libraryPath, modName);
    const destPath = path.join(targetPath, modName);
    try {
      if (enable) {
        await fs.remove(destPath); // Remove existing if it exists to ensure clean link
        await fs.ensureSymlink(sourcePath, destPath, "junction");
      } else {
        await fs.remove(destPath);
      }
      successfulMods.push(modName);
    } catch (error) {
      console.error(`Failed to apply change for mod ${modName}:`, error);
      success = false;
    }
  }

  return { success, successfulMods };
});
