export interface IniSyncDeps {
  getD3dxUserPath: () => string | null;
  getLibraryPath: () => string | null;
  pathExists: (p: string) => Promise<boolean>;
  readFile: (p: string, encoding: string) => Promise<string>;
  writeFile: (p: string, content: string, encoding: string) => Promise<void>;
  pathJoin: (...segments: string[]) => string;
  escapeRegExp: (s: string) => string;
}

export const findAllTogglesInD3dxUser = async (modName: string, deps: IniSyncDeps) => {
  const d3dxUserPath = deps.getD3dxUserPath();
  if (!d3dxUserPath || !(await deps.pathExists(d3dxUserPath))) throw new Error("d3dxUserPath not set");

  const d3dxUserContent = await deps.readFile(d3dxUserPath, "utf-8");
  const regex = new RegExp(
    `^\\$[/\\\\]mods[/\\\\]${deps.escapeRegExp(modName)}[/\\\\](.+?\\.ini)[/\\\\](.+)\\s=\\s(\\d+)\\s*$`,
    "gim"
  );
  const allToggles: Record<string, Record<string, string>> = {};
  const matches = d3dxUserContent.matchAll(regex);
  for (const match of matches) {
    const [, iniFileRelPath, toggleName, newValue] = match;
    const normalizedIniPath = iniFileRelPath.replace(/[\\/]/g, "/");
    if (!allToggles[normalizedIniPath]) {
      allToggles[normalizedIniPath] = {};
    }
    allToggles[normalizedIniPath][toggleName] = newValue;
  }
  return allToggles;
};

const updateModIniFile = async (
  modName: string,
  allToggles: Record<string, Record<string, string>>,
  deps: IniSyncDeps
) => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) throw new Error("Library path not set");
  const modPath = deps.pathJoin(libraryPath, modName);
  if (!(await deps.pathExists(modPath))) throw new Error("Mod path not found");

  const changedToggles: { toggleName: string; newValue: string }[] = [];
  for (const [iniRelPath, toggles] of Object.entries(allToggles)) {
    const iniFullPath = deps.pathJoin(modPath, iniRelPath);
    let isModified = false;
    if (!(await deps.pathExists(iniFullPath))) continue;
    let iniContent = await deps.readFile(iniFullPath, "utf-8");

    for (const [toggleName, newValue] of Object.entries(toggles)) {
      const regex = new RegExp(`^global\\spersist\\s\\$${deps.escapeRegExp(toggleName)}\\s=\\s(\\d+)`, "gim");
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
      await deps.writeFile(iniFullPath, iniContent, "utf-8");
    }
  }
  return changedToggles;
};

export const syncToggles = async (modName: string, deps: IniSyncDeps) => {
  const allToggles = await findAllTogglesInD3dxUser(modName, deps);
  return await updateModIniFile(modName, allToggles, deps);
};
