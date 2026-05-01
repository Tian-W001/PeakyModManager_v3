import ElectronStore from "electron-store";

const store = new ElectronStore();

export default store;

export const getLibraryPath = (): string | null => {
  return (store.get("libraryPath") as string) ?? null;
};

export const setLibraryPath = (libraryPath: string | null): void => {
  store.set("libraryPath", libraryPath);
};

export const getTargetPath = (): string | null => {
  return (store.get("targetPath") as string) ?? null;
};

export const setTargetPath = (targetPath: string | null): void => {
  store.set("targetPath", targetPath);
};

export const getD3dxUserPath = (): string | null => {
  return (store.get("d3dxUserPath") as string) ?? null;
};

export const setD3dxUserPath = (d3dxUserPath: string | null): void => {
  store.set("d3dxUserPath", d3dxUserPath);
};
