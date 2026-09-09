import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ModInfo } from "@shared/modInfo";
import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";
import { RootState } from "../store";
import { ModType } from "@shared/modType";
import { Character } from "@shared/character";

export interface libraryState {
  libraryPath: string | null;
  targetPath: string | null;
  d3dxUserPath: string | null;
  modInfos: ModInfo[];
  lastRefreshedVersion: string | null;
}

const initialState: libraryState = {
  libraryPath: null,
  targetPath: null,
  d3dxUserPath: null,
  modInfos: [],
  lastRefreshedVersion: null,
};

const libraryPersistConfig = {
  key: "library",
  storage,
  whitelist: ["libraryPath", "targetPath", "modInfos", "d3dxUserPath", "lastRefreshedVersion"],
};

export const setLibraryPath = createAsyncThunk("library/setLibraryPath", async (newPath: string) => {
  await window.electron.ipcRenderer.invoke("set-library-path", newPath);
  return newPath;
});

export const setTargetPath = createAsyncThunk("library/setTargetPath", async (newPath: string) => {
  await window.electron.ipcRenderer.invoke("set-target-path", newPath);
  return newPath;
});

export const setD3dxUserPath = createAsyncThunk("library/setD3dxUserPath", async (newPath: string) => {
  await window.electron.ipcRenderer.invoke("set-d3dx-user-path", newPath);
  return newPath;
});

export const loadLibrary = createAsyncThunk("library/load", async () => {
  const mods: ModInfo[] = await window.electron.ipcRenderer.invoke("load-library");
  return mods;
});

export const refreshLibraryAfterUpdate = createAsyncThunk<
  { modInfos: ModInfo[]; version: string; libraryPath: string } | null,
  void,
  { state: RootState }
>("library/refreshAfterUpdate", async (_arg, { getState }) => {
  const { libraryPath, lastRefreshedVersion } = getState().library;
  if (!libraryPath) return null;

  const version: unknown = await window.electron.ipcRenderer.invoke("get-app-version");
  if (typeof version !== "string" || !version.trim()) throw new Error("App version is unavailable");
  if (version === lastRefreshedVersion) return null;

  // Strict loading must distinguish a successfully loaded empty library from a failed scan.
  const modInfos: ModInfo[] = await window.electron.ipcRenderer.invoke("load-library", true);
  return { modInfos, version, libraryPath };
});

export const editModInfo = createAsyncThunk<
  { modName: string; newModInfo: ModInfo },
  { modName: string; newModInfo: Partial<ModInfo> },
  { state: RootState; rejectValue: string }
>("library/editModInfo", async ({ modName, newModInfo }, { getState, rejectWithValue }) => {
  const currentModInfo = getState().library.modInfos.find((mod) => mod.name === modName);
  if (!currentModInfo) {
    return rejectWithValue(`Mod not found: ${modName}`);
  }

  const mergedModInfo = { ...currentModInfo, ...newModInfo } as ModInfo;
  const savedModInfo: ModInfo | null = await window.electron.ipcRenderer.invoke(
    "edit-mod-info",
    modName,
    mergedModInfo
  );
  if (!savedModInfo) {
    return rejectWithValue(`Failed to save mod: ${modName}`);
  }
  return { modName, newModInfo: savedModInfo };
});

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    addModInfo: (state, action: PayloadAction<ModInfo>) => {
      //push to head
      state.modInfos.unshift(action.payload);
    },
    removeModInfo: (state, action: PayloadAction<string>) => {
      state.modInfos = state.modInfos.filter((mod) => mod.name !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLibrary.fulfilled, (state, action) => {
        state.modInfos = action.payload;
      })
      .addCase(refreshLibraryAfterUpdate.fulfilled, (state, action) => {
        if (!action.payload || action.payload.libraryPath !== state.libraryPath) return;
        state.modInfos = action.payload.modInfos;
        state.lastRefreshedVersion = action.payload.version;
      })
      .addCase(setLibraryPath.fulfilled, (state, action) => {
        if (state.libraryPath !== action.payload) state.lastRefreshedVersion = null;
        state.libraryPath = action.payload;
      })
      .addCase(setTargetPath.fulfilled, (state, action) => {
        state.targetPath = action.payload;
      })
      .addCase(setD3dxUserPath.fulfilled, (state, action) => {
        state.d3dxUserPath = action.payload;
      })
      .addCase(editModInfo.fulfilled, (state, action) => {
        const { modName, newModInfo } = action.payload;
        const modIndex = state.modInfos.findIndex((mod) => mod.name === modName);
        if (modIndex !== -1) {
          state.modInfos[modIndex] = newModInfo;
        }
      });
  },
});

export default persistReducer(libraryPersistConfig, librarySlice.reducer);
export const { addModInfo, removeModInfo } = librarySlice.actions;

export const selectLibraryPath = (state: RootState) => state.library.libraryPath;
export const selectTargetPath = (state: RootState) => state.library.targetPath;
export const selectD3dxUserPath = (state: RootState) => state.library.d3dxUserPath;
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
