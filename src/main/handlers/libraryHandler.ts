import path from "path";
import fs from "fs-extra";
import { app, ipcMain } from "electron";
import store from "../store";
import { ModInfo } from "../../shared/modInfo";
import { validateModInfo, createModInfoFile } from "./modInfoHandler";
import { isZippedFile, getMainWindow, unzipFile } from "../utils";

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
    return fixedModInfo;
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

const askOverwriteMod = async (modName: string): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const responseChannel = `overwrite-response-${modName}`;
    ipcMain.once(responseChannel, (_e, userConfirmed: boolean) => {
      resolve(userConfirmed);
    });

    getMainWindow()?.webContents.send("overwrite-ask", {
      modName: modName,
      responseChannel: responseChannel,
    });
  });
};

// Import a mod from the given source path (directory or archive) into the library
ipcMain.handle("import-mod", async (_event, sourcePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

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
  const isTempFolder = folderPath.startsWith(path.join(app.getPath("userData"), "Mods"));

  if (await fs.pathExists(destPath)) {
    console.log("Mod already exists in library: ", modName);

    const shouldOverwrite = await askOverwriteMod(modName);
    if (shouldOverwrite) {
      await fs.emptyDir(destPath);
    } else {
      if (isTempFolder) {
        await fs.remove(folderPath);
      }
      return null;
    }
  }

  try {
    await fs.copy(folderPath, destPath);
    if (isTempFolder) {
      await fs.remove(folderPath);
    }
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

    const modInfosWithTime = await Promise.all(
      modFolders.map(async (folder) => {
        try {
          const modInfo = await processModInfo(path.join(libraryPath, folder));
          const stats = await fs.stat(path.join(libraryPath, folder, "modinfo.json"));
          return { modInfo, mtime: stats.mtime.getTime() };
        } catch (error) {
          console.error(`Error processing mod in folder ${folder}:`, error);
          return null;
        }
      })
    );

    return modInfosWithTime
      .filter((item) => item !== null)
      .sort((a, b) => b.mtime - a.mtime)
      .map((item) => item.modInfo);
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

ipcMain.handle("sync-ini", async (_event, modName: string) => {
  /*
    Sync the toggles from d3dx_user.ini to mod's ini files in the library
    1. Read d3dx_user.ini from d3dxUserPath
    2. find lines with "$/mods/<modName>/<iniFilePath>/<toggleName> = <value>"
    3. edit the corresponding line in the mod's ini file with format "global persist $<toggleName> = <value>"
  */
  try {
    const allToggles = await findAllTogglesInD3dxUser(modName);
    await updateModIniFile(modName, allToggles);
    return true;
  } catch (error) {
    console.error(`Error syncing ini toggles for mod ${modName}:`, error);
    return false;
  }
});

const findAllTogglesInD3dxUser = async (modName: string) => {
  const d3dxUserPath = store.get("d3dxUserPath", null) as string | null;
  if (!d3dxUserPath || !(await fs.pathExists(d3dxUserPath))) throw new Error("d3dxUserPath not set");

  const d3dxUserContent = await fs.readFile(d3dxUserPath, "utf-8");
  const regex = new RegExp(
    //matching: $/mods/<modName>/<iniFilePath>/<toggleName> = <value>
    `/^\\$[\\/\\\\]mods[\\/\\\\]${escapeRegExp(modName)}[\\/\\\\](.+?\\.ini)[\\/\\\\](.+)\\s=\\s(\\d+)\\s*$`,
    "gim"
  );
  const allToggles: Record<string, Record<string, string>> = {};
  const matches = d3dxUserContent.matchAll(regex);
  for (const match of matches) {
    const [, iniFileRelPath, toggleName, newValue] = match;
    const normalizedIniPath = iniFileRelPath.replace(/[\\/]/g, path.sep);
    if (!allToggles[normalizedIniPath]) {
      allToggles[normalizedIniPath] = {};
    }
    allToggles[normalizedIniPath][toggleName] = newValue;
  }

  return allToggles;
};

const updateModIniFile = async (modName: string, allToggles: Record<string, Record<string, string>>) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath || !(await fs.pathExists(libraryPath))) throw new Error("Library path not set");
  const modPath = path.join(libraryPath, modName);
  if (!(await fs.pathExists(modPath))) throw new Error("Mod path not found");

  for (const [iniRelPath, toggles] of Object.entries(allToggles)) {
    const iniFullPath = path.join(modPath, iniRelPath);
    let isModified = false;
    if (!(await fs.pathExists(iniFullPath))) continue;
    let iniContent = await fs.readFile(iniFullPath, "utf-8");

    for (const [toggleName, newValue] of Object.entries(toggles)) {
      //matching: global persist $<toggleName> = <value>
      const regex = new RegExp(`^global\\spersist\\s\\$${escapeRegExp(toggleName)}\\s=\\s\\d+`, "gim");
      iniContent = iniContent.replace(regex, `global persist $${toggleName} = ${newValue}`);
      isModified = true;
    }
    if (isModified) {
      await fs.writeFile(iniFullPath, iniContent, "utf-8");
    }
  }
};

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
