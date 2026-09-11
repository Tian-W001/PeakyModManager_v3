import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Character } from "@shared/character";
import { ModType } from "@shared/modType";
import { RootState } from "../store";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { normalizeOutfitId } from "@shared/outfit";

export interface uiState {
  selectedMenuItem: ModType | "All";
  selectedCharacter: Character | "All";
  selectedOutfitId: number | "All";
  currentWallpaper: string;
}

const initialState: uiState = {
  selectedMenuItem: "All",
  selectedCharacter: "All",
  selectedOutfitId: "All",
  currentWallpaper: "zzz_wallpaper_0.jpg",
};

const uiPersistConfig = {
  key: "ui",
  storage,
  whitelist: ["currentWallpaper"],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSelectedMenuItem: (state, action: PayloadAction<ModType | "All">) => {
      state.selectedMenuItem = action.payload;
      state.selectedOutfitId = "All";
    },
    setSelectedCharacter: (state, action: PayloadAction<Character | "All">) => {
      state.selectedCharacter = action.payload;
      state.selectedOutfitId = "All";
    },
    setSelectedOutfitId: (state, action: PayloadAction<number | "All">) => {
      state.selectedOutfitId =
        action.payload === "All" || state.selectedCharacter === "All"
          ? "All"
          : normalizeOutfitId(state.selectedCharacter, action.payload);
    },
    setCurrentWallpaper: (state, action: PayloadAction<string>) => {
      state.currentWallpaper = action.payload;
    },
  },
});

export const selectSelectedMenuItem = (state: RootState) => state.ui.selectedMenuItem;
export const selectSelectedCharacter = (state: RootState) => state.ui.selectedCharacter;
export const selectSelectedOutfitId = (state: RootState) => state.ui.selectedOutfitId;
export const selectCurrentWallpaper = (state: RootState) => state.ui.currentWallpaper;

export default persistReducer(uiPersistConfig, uiSlice.reducer);
export const { setSelectedMenuItem, setSelectedCharacter, setSelectedOutfitId, setCurrentWallpaper } = uiSlice.actions;
