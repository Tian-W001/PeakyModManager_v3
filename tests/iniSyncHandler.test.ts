/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { findAllTogglesInD3dxUser } from "../src/main/handlers/iniSyncHandler";
import fs from "fs-extra";

vi.mock("fs-extra");

vi.mock("../src/main/services/storeService", () => ({
  getD3dxUserPath: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(),
  },
}));

vi.mock("../src/main/utils", async () => {
  const actual = await vi.importActual<typeof import("../src/main/utils")>("../src/main/utils");
  return {
    ...actual,
    escapeRegExp: actual.escapeRegExp,
  };
});

describe("findAllTogglesInD3dxUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly parse toggles from d3dx_user.ini", async () => {
    const modName = "TestMod";
    const d3dxUserPath = "/path/to/d3dx_user.ini";
    const d3dxUserContent = `
[SomeSection]
some_key = 1

$/mods/TestMod/Part1.ini/ToggleA = 1
$/mods/TestMod/Part1.ini/ToggleB = 0
$/mods/OtherMod/Part1.ini/ToggleC = 1
$/mods/TestMod/SubFolder/Part2.ini/ToggleD = 2
    `;

    const { getD3dxUserPath } = await import("../src/main/services/storeService");
    (getD3dxUserPath as any).mockReturnValue(d3dxUserPath);
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(d3dxUserContent);

    const result = await findAllTogglesInD3dxUser(modName);

    const path = await import("path");
    const part1Path = `Part1.ini`.replace(/[\\/]/g, path.sep);
    const part2Path = `SubFolder/Part2.ini`.replace(/[\\/]/g, path.sep);

    expect(result).toHaveProperty(part1Path);
    expect(result[part1Path]).toEqual({
      ToggleA: "1",
      ToggleB: "0",
    });

    expect(result).toHaveProperty(part2Path);
    expect(result[part2Path]).toEqual({
      ToggleD: "2",
    });

    const otherKey = Object.keys(result).find((k) => k.includes("OtherMod"));
    expect(otherKey).toBeUndefined();
  });

  it("should throw error if d3dxUserPath is not set", async () => {
    const { getD3dxUserPath } = await import("../src/main/services/storeService");
    (getD3dxUserPath as any).mockReturnValue(null);
    await expect(findAllTogglesInD3dxUser("TestMod")).rejects.toThrow("d3dxUserPath not set");
  });

  it("should throw error if d3dx_user.ini does not exist", async () => {
    const { getD3dxUserPath } = await import("../src/main/services/storeService");
    (getD3dxUserPath as any).mockReturnValue("/path/to/d3dx_user.ini");
    (fs.pathExists as any).mockResolvedValue(false);
    await expect(findAllTogglesInD3dxUser("TestMod")).rejects.toThrow("d3dxUserPath not set");
  });
});
