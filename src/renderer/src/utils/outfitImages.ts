import type { Character } from "@shared/character";
import unknownIcon from "@renderer/assets/outfit_icons/Unknown.webp";

const icons = import.meta.glob<string>("../assets/outfit_icons/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

export const getOutfitIcon = (character: Character, outfitId: number | "All") => {
  if (outfitId === "All" || outfitId === 0) return undefined;
  return icons[`../assets/outfit_icons/${character}-${outfitId}.webp`] ?? unknownIcon;
};
