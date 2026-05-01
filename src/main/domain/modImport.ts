import { ModInfo } from "../../shared/modInfo";
import { processModInfo } from "./modLibrary";

export interface ModImportDeps {
  getLibraryPath: () => string | null;
  getTempModDir: (modName: string) => string;
  pathExists: (p: string) => Promise<boolean>;
  stat: (p: string) => Promise<{ isFile(): boolean; isDirectory(): boolean }>;
  emptyDir: (p: string) => Promise<void>;
  copy: (src: string, dest: string) => Promise<void>;
  remove: (p: string) => Promise<void>;
  rename: (oldPath: string, newPath: string) => Promise<void>;
  move: (src: string, dest: string, opts?: { overwrite: boolean }) => Promise<void>;
  readdir: (p: string) => Promise<{ name: string; isDirectory: () => boolean }[]>;
  isZippedFile: (filename: string) => boolean;
  unzipFile: (src: string, dest: string) => Promise<void>;
  sendToRenderer: (channel: string, data: unknown) => void;
  onIpcOnce: (channel: string, handler: (...args: unknown[]) => void) => void;
  parsePathName: (p: string) => string;
  pathJoin: (...segments: string[]) => string;
  log: (msg: string) => void;
  readFile: (p: string, encoding: string) => Promise<string>;
  writeJson: (p: string, data: unknown) => Promise<void>;
  processModInfo: typeof processModInfo;
}

const unzipMod = async (zipPath: string, destPath: string, deps: ModImportDeps) => {
  await deps.emptyDir(destPath);
  deps.sendToRenderer("unzipping-mod", { modName: deps.parsePathName(zipPath) });
  try {
    await deps.unzipFile(zipPath, destPath);
  } catch (err) {
    deps.sendToRenderer("unzip-mod-error", { modName: deps.parsePathName(zipPath), error: String(err) });
    throw err;
  }
  deps.sendToRenderer("unzip-mod-finish", { modName: deps.parsePathName(zipPath) });
};

const askOverwriteMod = async (modName: string, deps: ModImportDeps): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const responseChannel = `overwrite-response-${modName}`;
    deps.onIpcOnce(responseChannel, (userConfirmed: unknown) => {
      resolve(userConfirmed as boolean);
    });
    deps.sendToRenderer("overwrite-ask", { modName, responseChannel });
  });
};

export const flattenSingleRootFolder = async (folderPath: string, deps: ModImportDeps) => {
  const entries = await deps.readdir(folderPath);
  if (entries.length !== 1 || !entries[0].isDirectory()) {
    return;
  }
  const innerFolderPath = deps.pathJoin(folderPath, entries[0].name);
  const tempInnerFolderPath = deps.pathJoin(folderPath, `tmp_${entries[0].name}`);
  await deps.rename(innerFolderPath, tempInnerFolderPath);
  const innerEntries = await deps.readdir(tempInnerFolderPath);
  for (const entry of innerEntries) {
    await deps.move(deps.pathJoin(tempInnerFolderPath, entry.name), deps.pathJoin(folderPath, entry.name), {
      overwrite: true,
    });
  }
  await deps.remove(tempInnerFolderPath);
};

export const importMod = async (sourcePath: string, deps: ModImportDeps): Promise<ModInfo | null> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) return null;

  let folderPath = sourcePath;
  let isZipped = false;
  const modName = deps.parsePathName(sourcePath);

  try {
    const stats = await deps.stat(sourcePath);
    if (stats.isFile() && deps.isZippedFile(sourcePath)) {
      isZipped = true;
      folderPath = deps.getTempModDir(modName);
      await unzipMod(sourcePath, folderPath, deps);
    } else if (!stats.isDirectory()) {
      return null;
    }
  } catch (error) {
    deps.log(`Error preparing mod source: ${error}`);
    return null;
  }

  const destPath = deps.pathJoin(libraryPath, modName);

  if (await deps.pathExists(destPath)) {
    deps.log(`Mod already exists in library: ${modName}`);

    const shouldOverwrite = await askOverwriteMod(modName, deps);
    if (shouldOverwrite) {
      await deps.emptyDir(destPath);
    } else {
      if (isZipped) {
        await deps.remove(folderPath);
      }
      return null;
    }
  }

  try {
    await deps.copy(folderPath, destPath);
    if (isZipped) {
      await deps.remove(folderPath);
    }
    await flattenSingleRootFolder(destPath, deps);
    return await deps.processModInfo(destPath, deps as unknown as Parameters<typeof processModInfo>[1]);
  } catch (error) {
    deps.log(`Error importing mod: ${error}`);
    return null;
  }
};

export interface ModCoverDeps {
  getLibraryPath: () => string | null;
  pathExists: (p: string) => Promise<boolean>;
  pathJoin: (...segments: string[]) => string;
  pathRelative: (from: string, to: string) => string;
  pathExtname: (p: string) => string;
  pathIsAbsolute: (p: string) => boolean;
  fetchUrl: (
    url: string
  ) => Promise<{ ok: boolean; headers: { get: (k: string) => string | null }; arrayBuffer(): Promise<ArrayBuffer> }>;
  extensionFromMime: (mimeType: string) => string | false;
  writeFile: (p: string, data: Buffer) => Promise<void>;
  copyFile: (src: string, dest: string) => Promise<void>;
  logError: (msg: string) => void;
}

export const importModCover = async (
  modName: string,
  imageSource: string,
  deps: ModCoverDeps
): Promise<string | null> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) return null;

  const modPath = deps.pathJoin(libraryPath, modName);

  if (/^https?:\/\//i.test(imageSource)) {
    let response;
    try {
      response = await deps.fetchUrl(imageSource);
    } catch (error) {
      deps.logError(`Failed to fetch cover URL: ${error}`);
      return null;
    }

    if (!response.ok) return null;

    const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!mimeType.startsWith("image/")) return null;
    const ext = deps.extensionFromMime(mimeType);
    if (!ext) return null;

    const newCoverName = `preview.${ext}`;
    try {
      const buffer = await response.arrayBuffer();
      await deps.writeFile(deps.pathJoin(modPath, newCoverName), Buffer.from(buffer));
      return newCoverName;
    } catch (error) {
      deps.logError(`Failed to save cover from URL: ${error}`);
      return null;
    }
  } else {
    const relativePath = deps.pathRelative(modPath, imageSource);
    if (!relativePath.startsWith("..") && !deps.pathIsAbsolute(relativePath)) {
      return relativePath;
    }

    const newCoverName = `preview${deps.pathExtname(imageSource)}`;
    try {
      await deps.copyFile(imageSource, deps.pathJoin(modPath, newCoverName));
      return newCoverName;
    } catch (error) {
      deps.logError(`Failed to copy cover file: ${error}`);
      return null;
    }
  }
};
