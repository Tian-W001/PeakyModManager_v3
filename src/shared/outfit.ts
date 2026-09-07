import type { Character } from "./character";
import { characterOutfitCounts } from "./characterOutfits";

export const getOutfitCount = (character: Character): number => characterOutfitCounts[character] ?? 1;

export const getOutfitIds = (character: Character): number[] =>
  Array.from({ length: getOutfitCount(character) }, (_, id) => id);

export const hasMultipleOutfits = (character: Character): boolean => getOutfitCount(character) > 1;

export const normalizeOutfitId = (character: Character, outfitId: unknown): number =>
  typeof outfitId === "number" && Number.isInteger(outfitId) && outfitId >= 0 && outfitId < getOutfitCount(character)
    ? outfitId
    : 0;
