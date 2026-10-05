import type { Character } from "@shared/character";
import unknownAvatar from "@renderer/assets/avatars/character_avatars/Unknown.webp";

const avatarModules = import.meta.glob<string>("@renderer/assets/avatars/character_avatars/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const avatars = Object.fromEntries(Object.entries(avatarModules).map(([path, url]) => [path.split("/").pop(), url]));

export const getCharacterAvatar = (character: Character) => avatars[`${character}.webp`] ?? unknownAvatar;
