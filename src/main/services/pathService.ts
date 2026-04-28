import fs from "fs-extra";
import { getLibraryPath, getTargetPath } from "./storeService";

export const validateLibraryPath = async (): Promise<boolean> => {
  const libraryPath = getLibraryPath();
  return !!(libraryPath && (await fs.pathExists(libraryPath)));
};

export const validateTargetPath = async (): Promise<boolean> => {
  const targetPath = getTargetPath();
  return !!(targetPath && (await fs.pathExists(targetPath)));
};

export const validatePaths = async (): Promise<boolean> => {
  const [library, target] = await Promise.all([validateLibraryPath(), validateTargetPath()]);
  return library && target;
};
