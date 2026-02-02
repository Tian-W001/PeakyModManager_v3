/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { findAllTogglesInD3dxUser } from "../src/main/handlers/libraryHandler";
import fs from "fs-extra";
import store from "../src/main/store";

// Mock fs-extra
vi.mock("fs-extra");

// Mock electron-store
// We need to mock the module that exports the store instance
vi.mock("../src/main/store", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock electron modules if they are used elsewhere in libraryHandler
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

// Mock other dependencies if necessary
vi.mock("../src/main/utils", async () => {
  const actual = await vi.importActual<typeof import("../src/main/utils")>("../src/main/utils");
  return {
    ...actual,
    isZippedFile: vi.fn(),
    getMainWindow: vi.fn(),
    unzipFile: vi.fn(),
  };
});

vi.mock("../src/main/handlers/modInfoHandler", () => ({
  validateModInfo: vi.fn(),
  createModInfoFile: vi.fn(),
}));

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

    // Setup mocks
    (store.get as any).mockReturnValue(d3dxUserPath);
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(d3dxUserContent);

    // Run string literal regex match manually to verify my expectation of the regex in the code
    // The code uses: new RegExp(`/^\\$[\\/\\\\]mods[\\/\\\\]${escapeRegExp(modName)}[\\/\\\\](.+?\\.ini)[\\/\\\\](.+)\\s=\\s(\\d+)\\s*$`, "gim")
    // escapeRegExp is local, but TestMod is safe.
    // Regex string for TestMod: /^\$[\/\\]mods[\/\\]TestMod[\/\\](.+?\.ini)[\/\\](.+)\s=\s(\d+)\s*$/gim

    const result = await findAllTogglesInD3dxUser(modName);

    // Expected structure:
    // {
    //   "Part1.ini": { "ToggleA": "1", "ToggleB": "0" },
    //   "SubFolder/Part2.ini": { "ToggleD": "2" }
    // }
    // Note: The code does `iniFileRelPath.replace(/[\\/]/g, path.sep)`.
    // In a test environment, path.sep might be '/' or '\'.
    // I should check what path.sep is or check against normalized paths.
    // Assuming posix for simple verification or construct expected keys using path.join/sep if needed.
    // However, I can just verify the keys exist.

    // For this test, I'll assume standard slashes or checking keys loosely if needed,
    // but the implementation explicitly normalizes.

    // Let's make the test robust to OS separators
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

    // Should not contain OtherMod
    const otherKey = Object.keys(result).find((k) => k.includes("OtherMod"));
    expect(otherKey).toBeUndefined();
  });

  it("should throw error if d3dxUserPath is not set", async () => {
    (store.get as any).mockReturnValue(null);
    await expect(findAllTogglesInD3dxUser("TestMod")).rejects.toThrow("d3dxUserPath not set");
  });

  it("should throw error if d3dx_user.ini does not exist", async () => {
    (store.get as any).mockReturnValue("/path/to/d3dx_user.ini");
    (fs.pathExists as any).mockResolvedValue(false);
    await expect(findAllTogglesInD3dxUser("TestMod")).rejects.toThrow("d3dxUserPath not set");
  });
});
