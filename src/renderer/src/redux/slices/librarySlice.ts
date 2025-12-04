import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ModInfo } from "src/shared/modInfo";
import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";
import { RootState } from "../store";
import { ModType } from "src/shared/modType";
import { Character } from "src/shared/character";

export interface libraryState {
  libraryPath: string | null;
  targetPath: string | null;
  modInfos: ModInfo[];
}

const initialState: libraryState = {
  libraryPath: null,
  targetPath: null,
  modInfos: [],
};

const libraryPersistConfig = {
  key: "library",
  storage,
  whitelist: ["libraryPath", "targetPath", "modInfos"],
};

export const setLibraryPath = createAsyncThunk("library/setLibraryPath", async (newPath: string) => {
  await window.electron.ipcRenderer.invoke("set-library-path", newPath);
  return newPath;
});

export const setTargetPath = createAsyncThunk("library/setTargetPath", async (newPath: string) => {
  await window.electron.ipcRenderer.invoke("set-target-path", newPath);
  return newPath;
});

export const loadLibrary = createAsyncThunk("library/load", async () => {
  const mods: ModInfo[] = await window.electron.ipcRenderer.invoke("load-library");
  return mods;
});

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    addModInfo: (state, action: PayloadAction<ModInfo>) => {
      state.modInfos.push(action.payload);
    },
    removeModInfo: (state, action: PayloadAction<string>) => {
      state.modInfos = state.modInfos.filter((mod) => mod.name !== action.payload);
    },
    editModInfo: (state, action: PayloadAction<{ modName: string; newModInfo: Partial<ModInfo> }>) => {
      const { modName, newModInfo } = action.payload;
      const modIndex = state.modInfos.findIndex((mod) => mod.name === modName);
      if (modIndex !== -1) {
        Object.assign(state.modInfos[modIndex], newModInfo);
      }
      window.electron.ipcRenderer.invoke("edit-mod-info", modName, { ...state.modInfos[modIndex] });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLibrary.fulfilled, (state, action) => {
        state.modInfos = action.payload;
      })
      .addCase(setLibraryPath.fulfilled, (state, action) => {
        state.libraryPath = action.payload;
      })
      .addCase(setTargetPath.fulfilled, (state, action) => {
        state.targetPath = action.payload;
      });
  },
});

export default persistReducer(libraryPersistConfig, librarySlice.reducer);
export const { editModInfo, addModInfo, removeModInfo } = librarySlice.actions;

export const selectLibraryPath = (state: RootState) => state.library.libraryPath;
export const selectTargetPath = (state: RootState) => state.library.targetPath;
export const selectModInfos = (state: RootState) => state.library.modInfos;
export const selectModByName = (name: string) => (state: RootState) => {
  return state.library.modInfos.find((mod) => mod.name === name);
};
export const selectModByType = (modType: ModType) => (state: RootState) => {
  return state.library.modInfos.filter((mod) => mod.modType === modType);
};
export const selectModByCharacter = (characterName: Character) => (state: RootState) => {
  return state.library.modInfos.filter((mod) => mod.modType === "Character" && mod.character === characterName);
};
