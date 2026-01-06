import path from "path";
import fs from "fs-extra";
import { defaultModInfo, ModInfo } from "../../shared/modInfo";
import { Character } from "../../shared/character";
import { ipcMain } from "electron/main";
import store from "../store";

export const createModInfoFile = (modPath: string) => {
  const modInfo: ModInfo = {
    name: path.basename(modPath),
    title: path.basename(modPath),
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
export const validateAndFixModInfo = (modInfo: any, folderName: string) => {
  const fixedModInfo: ModInfo = { ...defaultModInfo };
  for (const key in modInfo) {
    if (key in fixedModInfo) {
      fixedModInfo[key] = modInfo[key];
    }
  }
  fixedModInfo.name = folderName;
  if (!fixedModInfo.title) {
    fixedModInfo.title = folderName;
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

ipcMain.handle("edit-mod-info", async (_event, modName: string, newModInfo: ModInfo) => {
  const libraryPath = store.get("libraryPath", null) as string | null;
  if (!libraryPath) return;

  const modInfoPath = path.join(libraryPath, modName, "modinfo.json");
  if (fs.existsSync(modInfoPath)) {
    fs.writeFileSync(modInfoPath, JSON.stringify(newModInfo, null, 2));
  }
});

ipcMain.handle("autofill-modinfo", async (_event, modName: string) => {
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
