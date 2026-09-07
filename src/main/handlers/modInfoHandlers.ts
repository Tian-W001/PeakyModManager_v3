import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { ModInfo } from "../../shared/modInfo";
import { getLibraryPath } from "../services/storeService";
import { createModInfoFile, validateModInfo, autofillModInfo } from "../domain/modInfo";

export const registerModInfoHandlers = () => {
  ipcMain.handle("edit-mod-info", async (_event, modName: string, newModInfo: ModInfo) => {
    const libraryPath = getLibraryPath();
    if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

    const modInfoPath = path.join(libraryPath, modName, "modinfo.json");
    try {
      const { fixedModInfo } = validateModInfo({ ...newModInfo }, modName);
      await fs.writeJson(modInfoPath, fixedModInfo, { spaces: 2 });
      return fixedModInfo;
    } catch (err) {
      console.error("Error editing modinfo.json:", err);
      return null;
    }
  });

  ipcMain.handle("autofill-modinfo", async (_event, modName: string) => {
    const libraryPath = getLibraryPath();
    if (!libraryPath || !(await fs.pathExists(libraryPath))) return null;

    const modPath = path.join(libraryPath, modName);
    return await autofillModInfo(modPath, {
      pathExists: (p) => fs.pathExists(p),
      readdir: (p) => fs.readdir(p),
      stat: (p) => fs.stat(p),
      readFile: (p, enc) => fs.readFile(p, enc as BufferEncoding),
    });
  });
};

export { createModInfoFile, validateModInfo };
