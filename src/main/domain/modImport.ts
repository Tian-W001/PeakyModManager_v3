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
  onIpc: (channel: string, handler: (...args: unknown[]) => void) => () => void;
  overwriteTimeoutMs?: number;
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
    const timeoutMs = deps.overwriteTimeoutMs ?? 60_000;
    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const responseChannel = `overwrite-response-${requestId}`;
    let settled = false;
    let removeListener = () => {};

    const finish = (userConfirmed: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      removeListener();
      resolve(userConfirmed);
    };

    const timeoutId = setTimeout(() => {
      deps.log(`Overwrite request timed out for mod: ${modName}`);
      finish(false);
    }, timeoutMs);
    removeListener = deps.onIpc(responseChannel, (userConfirmed: unknown) => {
      finish(userConfirmed === true);
    });
    if (settled) {
      removeListener();
    }
    deps.sendToRenderer("overwrite-ask", {
      modName,
      responseChannel,
      requestId,
      timeoutMs,
    });
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
    url: string,
    timeoutMs: number
  ) => Promise<{ ok: boolean; headers: { get: (k: string) => string | null }; arrayBuffer(): Promise<ArrayBuffer> }>;
  extensionFromMime: (mimeType: string) => string | false;
  writeFile: (p: string, data: Buffer) => Promise<void>;
  copyFile: (src: string, dest: string) => Promise<void>;
  logError: (msg: string) => void;
}

export const MAX_COVER_IMAGE_BYTES = 10 * 1024 * 1024;
export const COVER_FETCH_TIMEOUT_MS = 15_000;

export const fetchRemoteCoverImage = async (
  imageSource: string,
  deps: Pick<ModCoverDeps, "fetchUrl" | "extensionFromMime" | "logError">
): Promise<{ buffer: Buffer; extension: string } | null> => {
  if (!/^https?:\/\//i.test(imageSource)) {
    deps.logError(`Rejected non-http cover URL: ${imageSource}`);
    return null;
  }

  let response;
  try {
    response = await deps.fetchUrl(imageSource, COVER_FETCH_TIMEOUT_MS);
  } catch (error) {
    deps.logError(`Failed to fetch cover URL: ${error}`);
    return null;
  }

  if (!response.ok) return null;

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_COVER_IMAGE_BYTES) {
    deps.logError(`Rejected cover URL over ${MAX_COVER_IMAGE_BYTES} bytes: ${imageSource}`);
    return null;
  }

  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!mimeType.startsWith("image/")) return null;
  const extension = deps.extensionFromMime(mimeType);
  if (!extension) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_COVER_IMAGE_BYTES) {
    deps.logError(`Rejected downloaded cover over ${MAX_COVER_IMAGE_BYTES} bytes: ${imageSource}`);
    return null;
  }

  return { buffer, extension };
};

export const importModCover = async (
  modName: string,
  imageSource: string,
  deps: ModCoverDeps
): Promise<string | null> => {
  const libraryPath = deps.getLibraryPath();
  if (!libraryPath || !(await deps.pathExists(libraryPath))) return null;

  const modPath = deps.pathJoin(libraryPath, modName);

  if (/^https?:\/\//i.test(imageSource)) {
    const remoteImage = await fetchRemoteCoverImage(imageSource, deps);
    if (!remoteImage) return null;

    const newCoverName = `preview.${remoteImage.extension}`;
    try {
      await deps.writeFile(deps.pathJoin(modPath, newCoverName), remoteImage.buffer);
      return newCoverName;
    } catch (error) {
      deps.logError(`Failed to save cover from URL: ${error}`);
      return null;
    }
  } else if (/^[a-z][a-z\d+\-.]*:\/\//i.test(imageSource)) {
    deps.logError(`Rejected unsupported cover URL: ${imageSource}`);
    return null;
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
