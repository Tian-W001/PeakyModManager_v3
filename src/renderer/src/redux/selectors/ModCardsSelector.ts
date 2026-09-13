import { createSelector } from "@reduxjs/toolkit";
import { selectSelectedCharacter, selectSelectedMenuItem, selectSelectedOutfitId } from "../slices/uiSlice";
import { selectModInfos } from "../slices/librarySlice";

export const selectModTypeFilteredModCards = createSelector(
  [selectSelectedMenuItem, selectSelectedCharacter, selectSelectedOutfitId, selectModInfos],
  (menuItem, char, outfitId, modInfos) => {
    if (menuItem === "All") {
      return modInfos;
    }
    if (menuItem === "Character") {
      return modInfos.filter(
        (mod) =>
          mod.modType === "Character" &&
          (char === "All" || (mod.character === char && (outfitId === "All" || (mod.outfitId ?? 0) === outfitId)))
      );
    }
    return modInfos.filter((mod) => mod.modType === menuItem);
  }
);
