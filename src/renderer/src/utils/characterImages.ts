import { Character, characterNameList } from "@shared/character";

export const characterBarImageList: (Character | "All")[] = [...characterNameList, "All"].toReversed() as (
  | Character
  | "All"
)[];

export const getCharacterImagePath = (char: Character | "All") => {
  return new URL(`../assets/character_images/${char}.png`, import.meta.url).href;
};

export const preloadCharacterBarImages = async () => {
  await Promise.allSettled(
    characterBarImageList.map(async (char) => {
      const image = new Image();
      image.src = getCharacterImagePath(char);
      if (image.decode) {
        await image.decode();
      }
    })
  );
};
