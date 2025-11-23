import { createSelector } from "@reduxjs/toolkit";
import { selectSelectedCharacter, selectSelectedMenuItem } from "../slices/uiSlice";
import { selectModInfos } from "../slices/librarySlice";

export const selectModTypeFilteredModCards = createSelector(
  [selectSelectedMenuItem, selectSelectedCharacter, selectModInfos],
  (menuItem, char, modInfos) => {
    if (menuItem === "All") {
      return modInfos;
    }
    if (menuItem === "Character") {
      return modInfos.filter((mod) => mod.modType === "Character" && (char === "All" || mod.character === char));
    }
    return modInfos.filter((mod) => mod.modType === menuItem);
  }
);
