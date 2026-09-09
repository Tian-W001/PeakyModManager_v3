import { createSelector } from "@reduxjs/toolkit";
import { selectSelectedCharacter, selectSelectedMenuItem, selectSelectedOutfitId } from "../slices/uiSlice";
import { selectModInfos } from "../slices/librarySlice";
import { normalizeOutfitId } from "@shared/outfit";
import { getOutfitCount } from "@shared/outfit";

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
          (char === "All" ||
            (mod.character === char &&
              (getOutfitCount(char) === 1 || outfitId === "All" || normalizeOutfitId(char, mod.outfitId) === outfitId)))
      );
    }
    return modInfos.filter((mod) => mod.modType === menuItem);
  }
);
