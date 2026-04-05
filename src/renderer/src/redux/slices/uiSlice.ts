import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Character } from "src/shared/character";
import { ModType } from "src/shared/modType";
import { RootState } from "../store";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface uiState {
  selectedMenuItem: ModType | "All";
  selectedCharacter: Character | "All";
  currentWallpaper: string;
  hideMaleCharacters: boolean;
}

const initialState: uiState = {
  selectedMenuItem: "All",
  selectedCharacter: "All",
  currentWallpaper: "zzz_wallpaper_0.jpg",
  hideMaleCharacters: false,
};

const uiPersistConfig = {
  key: "ui",
  storage,
  whitelist: ["currentWallpaper", "hideMaleCharacters"],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSelectedMenuItem: (state, action: PayloadAction<ModType | "All">) => {
      state.selectedMenuItem = action.payload;
    },
    setSelectedCharacter: (state, action: PayloadAction<Character | "All">) => {
      state.selectedCharacter = action.payload;
    },
    setCurrentWallpaper: (state, action: PayloadAction<string>) => {
      state.currentWallpaper = action.payload;
    },
    setHideMaleCharacters: (state, action: PayloadAction<boolean>) => {
      state.hideMaleCharacters = action.payload;
    },
  },
});

export const selectSelectedMenuItem = (state: RootState) => state.ui.selectedMenuItem;
export const selectSelectedCharacter = (state: RootState) => state.ui.selectedCharacter;
export const selectCurrentWallpaper = (state: RootState) => state.ui.currentWallpaper;
export const selectHideMaleCharacters = (state: RootState) => state.ui.hideMaleCharacters;

export default persistReducer(uiPersistConfig, uiSlice.reducer);
export const { setSelectedMenuItem, setSelectedCharacter, setCurrentWallpaper, setHideMaleCharacters } =
  uiSlice.actions;
