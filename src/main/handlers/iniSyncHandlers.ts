import { ipcMain } from "electron";
import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { changeKeyBinding, changeToggleState, getModToggleControls, syncToggles } from "../domain/iniSync";
import { getLibraryPath, getD3dxUserPath } from "../services/storeService";
import { escapeRegExp, isPathInside, resolveInside } from "../utils";
import { IniSyncDeps } from "../domain/iniSync";
import { ChangeKeyBindingRequest, ChangeToggleStateRequest } from "../../shared/threeDMigoto";

const replaceFile = async (filePath: string, content: string): Promise<void> => {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.pmm-tmp`;
  try {
    await fs.writeFile(temporaryPath, content, "utf-8");
    await fs.move(temporaryPath, filePath, { overwrite: true });
  } finally {
    await fs.remove(temporaryPath);
  }
};

const listIniFiles = async (rootPath: string): Promise<string[]> => {
  const iniPaths: string[] = [];
  const visit = async (directoryPath: string): Promise<void> => {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".ini") {
        iniPaths.push(path.relative(rootPath, entryPath).replace(/\\/g, "/"));
      }
    }
  };

  await visit(rootPath);
  return iniPaths;
};

const deps: IniSyncDeps = {
  getD3dxUserPath,
  getLibraryPath,
  pathExists: (p: string) => fs.pathExists(p),
  readFile: (p: string, encoding: string) => fs.readFile(p, encoding as BufferEncoding),
  replaceFile,
  listIniFiles,
  resolveInside,
  isPathInside,
  realpath: (p: string) => fs.realpath(p),
  pathExtname: (p: string) => path.extname(p),
  escapeRegExp,
};

export const registerIniSyncHandlers = () => {
  ipcMain.handle("get-mod-toggle-controls", async (_event, modName: string) => {
    try {
      return await getModToggleControls(modName, deps);
    } catch (error) {
      console.error(`Error reading 3DMigoto toggles for mod ${modName}:`, error);
      return {
        ok: false,
        code: "internal-error",
        message: String(error),
        toggles: [],
        warnings: [],
      };
    }
  });

  ipcMain.handle("sync-toggles", async (_event, modName: string) => {
    try {
      return await syncToggles(modName, deps);
    } catch (error) {
      console.error(`Error syncing ini toggles for mod ${modName}:`, error);
      return {
        ok: false,
        code: "internal-error",
        message: String(error),
        changes: [],
        skipped: [],
      };
    }
  });

  ipcMain.handle("change-key-binding", async (_event, request: ChangeKeyBindingRequest) => {
    try {
      return await changeKeyBinding(request, deps);
    } catch (error) {
      console.error("Error changing 3DMigoto key binding:", error);
      return {
        ok: false,
        code: "internal-error",
        message: String(error),
      };
    }
  });

  ipcMain.handle("change-toggle-state", async (_event, request: ChangeToggleStateRequest) => {
    try {
      return await changeToggleState(request, deps);
    } catch (error) {
      console.error("Error changing 3DMigoto toggle state:", error);
      return {
        ok: false,
        code: "internal-error",
        message: String(error),
      };
    }
  });
};
