import { describe, expect, it } from "vitest";
import characters from "../scripts/characters.json";
import en from "../src/renderer/src/i18n/locales/en.json";
import zh from "../src/renderer/src/i18n/locales/zh.json";
import { getOutfitCount, getOutfitIds, normalizeOutfitId } from "../src/shared/outfit";

describe("generated outfit catalog", () => {
  for (const character of characters) {
    it(`keeps ${character.id} indices and translations aligned with characters.json`, () => {
      const id = character.id as keyof typeof en.characters.outfits;
      const outfits = character.outfits?.length ? character.outfits : [{ en: "Default Outfit", zh: "默认时装" }];
      expect(getOutfitIds(id)).toEqual([...outfits.map((_, index) => index + 1), 0]);
      expect(getOutfitCount(id)).toBe(outfits.length);
      expect(en.characters.outfits[id]).toEqual({
        ...Object.fromEntries(outfits.map((outfit, index) => [index + 1, outfit.en])),
      });
      expect(zh.characters.outfits[id]).toEqual({
        ...Object.fromEntries(outfits.map((outfit, index) => [index + 1, outfit.zh])),
      });
    });
  }

  it("keeps missing metadata under None-Outfit after an outfit catalog expansion", () => {
    expect(getOutfitCount("Belle")).toBeGreaterThan(1);
    expect(normalizeOutfitId("Belle", undefined)).toBe(0);
    expect(normalizeOutfitId("Belle", 0)).toBe(0);
    expect(normalizeOutfitId("Belle", 1)).toBe(1);
    expect(normalizeOutfitId("Belle", 4)).toBe(4);
    expect(normalizeOutfitId("Belle", 5)).toBe(0);
  });

  it("does not count None-Outfit as a second outfit for UI visibility", () => {
    expect(getOutfitIds("Anby")).toEqual([1, 0]);
    expect(getOutfitCount("Anby")).toBe(1);
    expect(normalizeOutfitId("Anby", 1)).toBe(1);
  });
});
