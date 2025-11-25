import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Character } from "src/shared/character";
import { ModType } from "src/shared/modType";
import { RootState } from "../store";

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

export const selectSelectedMenuItem = (state: RootState) => state.ui.selectedMenuItem;
export const selectSelectedCharacter = (state: RootState) => state.ui.selectedCharacter;

export default uiSlice.reducer;
export const { setSelectedMenuItem, setSelectedCharacter } = uiSlice.actions;
