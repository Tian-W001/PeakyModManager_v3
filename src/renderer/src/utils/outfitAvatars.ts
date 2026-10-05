import type { Character } from "@shared/character";
import unknownIcon from "@renderer/assets/outfit_icons/Unknown.webp";

const iconModules = import.meta.glob<string>("@renderer/assets/outfit_icons/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const icons = Object.fromEntries(Object.entries(iconModules).map(([path, url]) => [path.split("/").pop(), url]));

export const getOutfitIcon = (character: Character, outfitId: number | "All") => {
  if (outfitId === "All" || outfitId === 0) return undefined;
  return icons[`${character}-${outfitId}.webp`] ?? unknownIcon;
};
