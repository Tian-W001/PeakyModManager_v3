import path from "path";
import fs from "fs-extra";
import { ipcMain } from "electron";
import { escapeRegExp } from "../utils";
import { getLibraryPath, getD3dxUserPath } from "../services/storeService";

export const findAllTogglesInD3dxUser = async (modName: string) => {
  const d3dxUserPath = getD3dxUserPath();
  if (!d3dxUserPath || !(await fs.pathExists(d3dxUserPath))) throw new Error("d3dxUserPath not set");

  const d3dxUserContent = await fs.readFile(d3dxUserPath, "utf-8");
  const regex = new RegExp(
    `^\\$[/\\\\]mods[/\\\\]${escapeRegExp(modName)}[/\\\\](.+?\\.ini)[/\\\\](.+)\\s=\\s(\\d+)\\s*$`,
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
  const libraryPath = getLibraryPath();
  if (!libraryPath || !(await fs.pathExists(libraryPath))) throw new Error("Library path not set");
  const modPath = path.join(libraryPath, modName);
  if (!(await fs.pathExists(modPath))) throw new Error("Mod path not found");

  const changedToggles: { toggleName: string; newValue: string }[] = [];
  for (const [iniRelPath, toggles] of Object.entries(allToggles)) {
    const iniFullPath = path.join(modPath, iniRelPath);
    let isModified = false;
    if (!(await fs.pathExists(iniFullPath))) continue;
    let iniContent = await fs.readFile(iniFullPath, "utf-8");

    for (const [toggleName, newValue] of Object.entries(toggles)) {
      const regex = new RegExp(`^global\\spersist\\s\\$${escapeRegExp(toggleName)}\\s=\\s(\\d+)`, "gim");
      const match = regex.exec(iniContent);
      if (match) {
        const oldValue = match[1];
        if (oldValue !== newValue) {
          iniContent = iniContent.replace(regex, `global persist $${toggleName} = ${newValue}`);
          changedToggles.push({ toggleName, newValue });
          isModified = true;
        }
      }
    }
    if (isModified) {
      await fs.writeFile(iniFullPath, iniContent, "utf-8");
    }
  }
  return changedToggles;
};

ipcMain.handle("sync-toggles", async (_event, modName: string) => {
  try {
    const allToggles = await findAllTogglesInD3dxUser(modName);
    return await updateModIniFile(modName, allToggles);
  } catch (error) {
    console.error(`Error syncing ini toggles for mod ${modName}:`, error);
    return null;
  }
});
