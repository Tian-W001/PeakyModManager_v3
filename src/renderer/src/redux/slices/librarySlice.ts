import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ModInfo } from "src/shared/modInfo";
import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";
import { RootState } from "../store";
import { ModType } from "src/shared/modType";
import { Character } from "src/shared/character";

export interface libraryState {
  libraryPath: string | null;
  modInfos: ModInfo[];
}

const initialState: libraryState = {
  libraryPath: null,
  modInfos: [],
};

const libraryPersistConfig = {
  key: "library",
  storage,
  whitelist: ["libraryPath", "modInfos"],
};

export const loadLibrary = createAsyncThunk("library/load", async (libraryPath: string | null) => {
  const mods: ModInfo[] = await window.electron.ipcRenderer.invoke("load-library", libraryPath);
  //console.log("Loaded mods from thunk:", mods);
  return mods;
});

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    setLibraryPath: (state, action: PayloadAction<string | null>) => {
      state.libraryPath = action.payload;
      window.electron.ipcRenderer.invoke("set-library-path", action.payload);
    },
    editModInfo: (state, action: PayloadAction<{ modName: string; newModInfo: Partial<ModInfo> }>) => {
      const { modName, newModInfo } = action.payload;
      const modIndex = state.modInfos.findIndex((mod) => mod.name === modName);
      if (modIndex !== -1) {
        Object.assign(state.modInfos[modIndex], newModInfo);
      }
      window.electron.ipcRenderer.invoke("edit-mod-info", modName, { ...state.modInfos[modIndex] });
      console.log("Edited mod info:", state.modInfos[modIndex]);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadLibrary.fulfilled, (state, action) => {
      console.log("Loaded mods in extraReducers:", action.payload);
      state.modInfos = action.payload;
    });
  },
});

export default persistReducer(libraryPersistConfig, librarySlice.reducer);
export const { editModInfo, setLibraryPath } = librarySlice.actions;

export const selectLibraryPath = (state: RootState) => state.library.libraryPath;
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
