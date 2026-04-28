import path from "path";
import fs from "fs-extra";
import { app, ipcMain, net } from "electron";
import mime from "mime-types";
import { ModInfo } from "../../shared/modInfo";
import { validateModInfo, createModInfoFile } from "./modInfoHandler";
import { isZippedFile, unzipFile } from "../utils";
import { getLibraryPath } from "../services/storeService";
import { getMainWindow } from "../services/windowService";

ipcMain.handle("import-mod-cover", async (_event, modName: string, imageSource: string) => {
  const libraryPath = getLibraryPath();
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

  const modPath = path.join(libraryPath, modName);

  if (/^https?:\/\//i.test(imageSource)) {
    let response: Response;
    try {
      response = await net.fetch(imageSource);
    } catch (error) {
      console.error("Failed to fetch cover URL:", error);
      return null;
    }

    if (!response.ok) return null;

    const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!mimeType.startsWith("image/")) return null;
    const ext = mime.extension(mimeType);
    if (!ext) return null;

    const newCoverName = `preview.${ext}`;
    try {
      const buffer = await response.arrayBuffer();
      await fs.writeFile(path.join(modPath, newCoverName), Buffer.from(buffer));
      return newCoverName;
    } catch (error) {
      console.error("Failed to save cover from URL:", error);
      return null;
    }
  } else {
    const relativePath = path.relative(modPath, imageSource);
    if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      return relativePath;
    }

    const newCoverName = `preview${path.extname(imageSource)}`;
    try {
      await fs.copy(imageSource, path.join(modPath, newCoverName));
      return newCoverName;
    } catch (error) {
      console.error("Failed to copy cover file:", error);
      return null;
    }
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

export { processModInfo };

const unzipMod = async (zipPath: string, destPath: string) => {
  await fs.emptyDir(destPath);
  getMainWindow()?.webContents.send("unzipping-mod", { modName: path.basename(zipPath) });
  try {
    await unzipFile(zipPath, destPath);
  } catch (_err) {
    getMainWindow()?.webContents.send("unzip-mod-error", { modName: path.basename(zipPath), error: String(_err) });
    throw _err;
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

const flattenSingleRootFolder = async (folderPath: string) => {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0].isDirectory()) {
    return;
  }
  const innerFolderPath = path.join(folderPath, entries[0].name);
  const tempInnerFolderPath = path.join(folderPath, `tmp_${entries[0].name}`);
  await fs.rename(innerFolderPath, tempInnerFolderPath);
  const innerEntries = await fs.readdir(tempInnerFolderPath);
  for (const entry of innerEntries) {
    const srcPath = path.join(tempInnerFolderPath, entry);
    const destPath = path.join(folderPath, entry);
    await fs.move(srcPath, destPath, { overwrite: true });
  }
  await fs.remove(tempInnerFolderPath);
};

ipcMain.handle("import-mod", async (_event, sourcePath: string) => {
  const libraryPath = getLibraryPath();
  if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

  let folderPath = sourcePath;
  let isZipped = false;
  const modName = path.parse(path.basename(sourcePath)).name;

  try {
    const stats = await fs.stat(sourcePath);
    if (stats.isFile() && isZippedFile(sourcePath)) {
      isZipped = true;
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

    const shouldOverwrite = await askOverwriteMod(modName);
    if (shouldOverwrite) {
      await fs.emptyDir(destPath);
    } else {
      if (isZipped) {
        await fs.remove(folderPath);
      }
      return null;
    }
  }

  try {
    await fs.copy(folderPath, destPath);
    if (isZipped) {
      await fs.remove(folderPath);
    }
    await flattenSingleRootFolder(destPath);
    return await processModInfo(destPath);
  } catch (error) {
    console.error("Error importing mod:", error);
    return null;
  }
});
