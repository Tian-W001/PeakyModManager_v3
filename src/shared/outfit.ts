import type { Character } from "./character";
import { characterOutfitCounts } from "./characterOutfits";

export const getOutfitCount = (character: Character): number => characterOutfitCounts[character] ?? 1;

export const getOutfitIds = (character: Character): number[] =>
  // Catalog outfits come first; None-Outfit (ID 0) is the last option.
  [...Array.from({ length: getOutfitCount(character) }, (_, index) => index + 1), 0];

export const normalizeOutfitId = (character: Character, outfitId: unknown): number =>
  typeof outfitId === "number" && Number.isInteger(outfitId) && outfitId >= 0 && outfitId <= getOutfitCount(character)
    ? outfitId
    : 0;
