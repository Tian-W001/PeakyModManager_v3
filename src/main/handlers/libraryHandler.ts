import path from "path";
import fs from "fs-extra";
import { ipcMain } from "electron";
import sevenBin from "7zip-bin";
import Seven from "node-7z";
import store from "../store";
import { ModInfo } from "../../shared/modInfo";
import { validateAndFixModInfo, createModInfoFile } from "./modInfoHandler";
import { isZippedFile, asarToAsarUnpacked, getMainWindow } from "../utils";

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

// Import a mod from the given source path (directory or archive) into the library
ipcMain.handle("import-mod", async (_event, sourcePath: string) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return false;

  try {
    const stats = await fs.stat(sourcePath);
    let destPath: string;

    if (stats.isFile() && isZippedFile(sourcePath)) {
      const modName = path.basename(sourcePath, path.extname(sourcePath));
      destPath = path.join(libraryPath, modName);
      await fs.ensureDir(destPath);

      getMainWindow()?.webContents.send("unzipping-mod", { modName });
      await new Promise<void>((resolve, reject) => {
        const stream = Seven.extractFull(sourcePath, destPath, {
          $bin: asarToAsarUnpacked(sevenBin.path7za),
        });
        stream.on("end", () => {
          getMainWindow()?.webContents.send("unzip-mod-finish", { modName });
          resolve();
        });
        stream.on("error", (err) => reject(err));
      });
    } else if (stats.isDirectory()) {
      const modName = path.basename(sourcePath);
      destPath = path.join(libraryPath, modName);
      await fs.copy(sourcePath, destPath);
    } else {
      console.error("Imported path is not a directory or supported archive:", sourcePath);
      return false;
    }

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
  const targetPath = store.get("targetPath", null) as string | null;
  if (!libraryPath || !targetPath) return false;

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
