import { createSelector } from "@reduxjs/toolkit";
import { characterNameList, characterGenderMap, Character } from "@shared/character";
import { selectHideMaleCharacters } from "../slices/uiSlice";

export const selectVisibleCharacters = createSelector([selectHideMaleCharacters], (hideMaleCharacters): Character[] => {
  if (!hideMaleCharacters) {
    return [...characterNameList] as Character[];
  } else {
    // Filter out male characters when hideMaleCharacters is true
    return characterNameList.filter((char) => {
      const gender = characterGenderMap[char];
      return gender !== "male";
    }) as Character[];
  }
});
