import { describe, it, expect } from "vitest";
import { findAllTogglesInD3dxUser } from "../src/main/domain/iniSync";
import { IniSyncDeps } from "../src/main/domain/iniSync";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeDeps = (overrides: Partial<IniSyncDeps> = {}): IniSyncDeps => ({
  getD3dxUserPath: () => "/path/to/d3dx_user.ini",
  getLibraryPath: () => "/path/to/library",
  pathExists: async () => true,
  readFile: async () => "",
  writeFile: async () => {},
  pathJoin: (...args: string[]) => args.join("/"),
  escapeRegExp,
  ...overrides,
});

describe("findAllTogglesInD3dxUser", () => {
  it("should correctly parse toggles from d3dx_user.ini", async () => {
    const modName = "TestMod";
    const d3dxUserContent = `
[SomeSection]
some_key = 1

$/mods/TestMod/Part1.ini/ToggleA = 1
$/mods/TestMod/Part1.ini/ToggleB = 0
$/mods/OtherMod/Part1.ini/ToggleC = 1
$/mods/TestMod/SubFolder/Part2.ini/ToggleD = 2
    `;

    const deps = makeDeps({ readFile: async () => d3dxUserContent });

    const result = await findAllTogglesInD3dxUser(modName, deps);

    expect(result).toHaveProperty("Part1.ini");
    expect(result["Part1.ini"]).toEqual({
      ToggleA: "1",
      ToggleB: "0",
    });

    expect(result).toHaveProperty("SubFolder/Part2.ini");
    expect(result["SubFolder/Part2.ini"]).toEqual({
      ToggleD: "2",
    });

    const otherKey = Object.keys(result).find((k) => k.includes("OtherMod"));
    expect(otherKey).toBeUndefined();
  });

  it("should throw error if d3dxUserPath is not set", async () => {
    const deps = makeDeps({ getD3dxUserPath: () => null });
    await expect(findAllTogglesInD3dxUser("TestMod", deps)).rejects.toThrow("d3dxUserPath not set");
  });

  it("should throw error if d3dx_user.ini does not exist", async () => {
    const deps = makeDeps({ pathExists: async () => false });
    await expect(findAllTogglesInD3dxUser("TestMod", deps)).rejects.toThrow("d3dxUserPath not set");
  });
});
