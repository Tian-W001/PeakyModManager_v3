import { Character } from "./character";
import { ModType } from "./modType";

export interface BaseModInfo {
  name: string;
  description: string;
  source: string;
  coverImage: string;
}

export type ModInfo =
  | (BaseModInfo & {
      modType: "Character";
      character: Character;
    })
  | (BaseModInfo & {
      modType: Exclude<ModType, "Character">;
      character?: undefined;
    });

export const defaultModInfo: ModInfo = {
  name: "Unnamed mod",
  modType: "Unknown",
  description: "No description provided.",
  source: "",
  coverImage: "",
};
