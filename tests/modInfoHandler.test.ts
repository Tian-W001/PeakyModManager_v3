import { describe, it, expect, vi } from "vitest";
import { validateModInfo, createModInfoFile } from "../src/main/domain/modInfo";

describe("validateModInfo", () => {
  it("should return valid=true when modInfo matches defaults already", () => {
    const modInfo = {
      name: "TestMod",
      title: "TestMod",
      modType: "Unknown" as const,
      description: "No description provided.",
      source: "",
      coverImage: "",
    };
    const result = validateModInfo(modInfo, "TestMod");
    expect(result.valid).toBe(true);
    expect(result.fixedModInfo.name).toBe("TestMod");
    expect(result.fixedModInfo.title).toBe("TestMod");
    expect(result.fixedModInfo.modType).toBe("Unknown");
  });

  it("should return valid=false when title is missing (fixed to folderName)", () => {
    const modInfo = {
      name: "MyMod",
      title: null,
      modType: "Misc" as const,
      description: "",
      source: "",
      coverImage: "",
    };
    const result = validateModInfo(modInfo, "MyMod");
    expect(result.valid).toBe(false);
    expect(result.fixedModInfo.title).toBe("MyMod");
  });

  it("should fill missing fields with defaults", () => {
    const modInfo = { name: "Minimal" };
    const result = validateModInfo(modInfo, "Minimal");
    expect(result.valid).toBe(false);
    expect(result.fixedModInfo.name).toBe("Minimal");
    expect(result.fixedModInfo.modType).toBe("Unknown");
    expect(result.fixedModInfo.description).toBe("No description provided.");
  });

  it("should set character=Unknown for Character type without character field", () => {
    const modInfo = {
      name: "CharMod",
      modType: "Character" as const,
    };
    const result = validateModInfo(modInfo, "CharMod");
    expect(result.fixedModInfo.modType).toBe("Character");
    expect(result.fixedModInfo.character).toBe("Unknown");
  });

  it("should preserve character when provided for Character type", () => {
    const modInfo = {
      name: "CharMod",
      title: "CharMod",
      modType: "Character" as const,
      character: "Ellen" as const,
      source: "",
      coverImage: "",
    };
    const result = validateModInfo(modInfo, "CharMod");
    expect(result.fixedModInfo.character).toBe("Ellen");
  });

  it("should strip unknown extra fields", () => {
    const modInfo = {
      name: "Test",
      extraField: "should be removed",
      anotherExtra: 123,
    };
    const result = validateModInfo(modInfo, "Test");
    expect(result.fixedModInfo).not.toHaveProperty("extraField");
    expect(result.fixedModInfo).not.toHaveProperty("anotherExtra");
  });
});

describe("createModInfoFile", () => {
  it("should create a modinfo.json with default values", async () => {
    const written: string[] = [];
    const deps = {
      writeJson: vi.fn(async (p: string) => {
        written.push(p);
      }),
    };

    const result = await createModInfoFile("/lib/SomeMod", deps);

    expect(deps.writeJson).toHaveBeenCalled();
    expect(result.name).toBe("SomeMod");
    expect(result.title).toBe("SomeMod");
    expect(result.modType).toBe("Unknown");
    expect(result.coverImage).toBe("");
    expect(result.source).toBe("");
  });
});
