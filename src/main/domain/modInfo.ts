import path from "path";
import { defaultModInfo, ModInfo } from "../../shared/modInfo";
import { Character } from "../../shared/character";

export const createModInfoFile = async (modPath: string, deps: ModInfoFileWriter): Promise<ModInfo> => {
  const modInfo: ModInfo = {
    name: path.basename(modPath),
    title: path.basename(modPath),
    modType: "Unknown",
    description: "",
    source: "",
    coverImage: "",
  };
  await deps.writeJson(path.join(modPath, "modinfo.json"), modInfo);
  return modInfo;
};

export const validateModInfo = (modInfo: Record<string, unknown>, folderName: string) => {
  const fixedModInfo: ModInfo = { ...defaultModInfo };
  for (const key in modInfo) {
    if (key in fixedModInfo) {
      (fixedModInfo as unknown as Record<string, unknown>)[key] = modInfo[key];
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
  if (JSON.stringify(modInfo, null, 0) === JSON.stringify(fixedModInfo, null, 0)) {
    return { valid: true, fixedModInfo };
  } else {
    return { valid: false, fixedModInfo };
  }
};

export const autofillModInfo = async (modPath: string, deps: ModInfoFileSystem): Promise<AutofillResult> => {
  if (!(await deps.pathExists(modPath))) return { description: null, coverImage: null };

  let description = "";
  let coverImage = "";

  try {
    const files = await deps.readdir(modPath);

    const readmeFile = files.find((file) => file.toLowerCase().includes("readme"));
    if (readmeFile) {
      const readmePath = path.join(modPath, readmeFile);
      const stats = await deps.stat(readmePath);
      if (stats.isFile()) {
        description = await deps.readFile(readmePath, "utf-8");
      }
    }

    const imageExtensions = [".jpg", ".png", ".gif", ".webp", ".jpeg"];
    const imageFiles = files.filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));

    if (imageFiles.length > 0) {
      const previewImage = imageFiles.find((file) => path.parse(file).name.toLowerCase() === "preview");
      coverImage = previewImage || imageFiles[0];
    }
  } catch {
    //
  }

  return { description: description || null, coverImage: coverImage || null };
};

export interface ModInfoFileWriter {
  writeJson: (filePath: string, data: unknown) => Promise<void>;
}

export interface ModInfoFileSystem {
  pathExists: (p: string) => Promise<boolean>;
  readdir: (p: string) => Promise<string[]>;
  stat: (p: string) => Promise<{ isFile(): boolean }>;
  readFile: (p: string, encoding: string) => Promise<string>;
}

export interface AutofillResult {
  description: string | null;
  coverImage: string | null;
}
