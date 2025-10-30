import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ModInfo } from "src/types/modInfo";

export interface libraryState {
  modInfos: ModInfo[];
}

const initialState: libraryState = {
  modInfos: [],
};

export const loadLibrary = createAsyncThunk("library/load", async (libraryPath: string) => {
  const mods: ModInfo[] = await window.electron.ipcRenderer.invoke("load-library", libraryPath);
  console.log("Loaded mods from thunk:", mods);
  return mods;
});

export const readLibrary = createAsyncThunk("library/read", async () => {
  const mods: ModInfo[] = await window.electron.ipcRenderer.invoke("read-library");
  return mods;
});

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadLibrary.fulfilled, (state, action) => {
        state.modInfos = action.payload;
      })
      .addCase(readLibrary.fulfilled, (state, action) => {
        state.modInfos = action.payload;
      });
  },
});

export default librarySlice.reducer;

export const selectModInfos = (state: { library: libraryState }): ModInfo[] => state.library.modInfos;
