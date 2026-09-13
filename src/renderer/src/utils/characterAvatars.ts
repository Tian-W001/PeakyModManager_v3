import type { Character } from "@shared/character";
import unknownAvatar from "@renderer/assets/avatars/character_avatars/Unknown.webp";

const avatars = import.meta.glob<string>("../assets/avatars/character_avatars/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

export const getCharacterAvatar = (character: Character) =>
  avatars[`../assets/avatars/character_avatars/${character}.webp`] ?? unknownAvatar;
