import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Character } from "src/types/character";
import { ModType } from "src/types/modType";

export interface uiState {
  selectedMenuItem: ModType | "All";
  selectedCharacter: Character | "All";
}

const initialState: uiState = {
  selectedMenuItem: "All",
  selectedCharacter: "All",
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
  },
});

export const selectSelectedMenuItem = (state: { ui: uiState }) => state.ui.selectedMenuItem;
export const selectSelectedCharacter = (state: { ui: uiState }) => state.ui.selectedCharacter;

export default uiSlice.reducer;
export const { setSelectedMenuItem, setSelectedCharacter } = uiSlice.actions;
