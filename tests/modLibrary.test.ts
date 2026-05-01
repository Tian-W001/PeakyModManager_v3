import { describe, it, expect, vi } from "vitest";
import { processModInfo, loadLibrary, deleteMod } from "../src/main/domain/modLibrary";
import { ModLibraryDeps } from "../src/main/domain/modLibrary";

const makeDeps = (overrides: Partial<ModLibraryDeps> = {}): ModLibraryDeps => ({
  getLibraryPath: () => "/library",
  getTargetPath: () => "/target",
  pathExists: async () => true,
  readdir: async () => [],
  stat: async () => ({ mtime: new Date("2025-01-15") }),
  remove: async () => {},
  pathJoin: (...args: string[]) => args.join("/"),
  readFile: async () => "{}",
  writeJson: async () => {},
  logError: () => {},
  ...overrides,
});

const validModInfoJson = JSON.stringify({
  name: "CoolMod",
  title: "Cool Mod",
  modType: "Misc",
  description: "A cool mod",
  source: "github.com",
  coverImage: "preview.png",
});

describe("processModInfo", () => {
  it("should read and validate existing modinfo.json", async () => {
    const writeJsonSpy = vi.fn(async () => {});
    const deps = makeDeps({
      readFile: async () => validModInfoJson,
      writeJson: writeJsonSpy,
    });

    const result = await processModInfo("/library/CoolMod", deps);

    expect(result.name).toBe("CoolMod");
    expect(result.title).toBe("Cool Mod");
    expect(result.modType).toBe("Misc");
    expect(result.description).toBe("A cool mod");
    expect(writeJsonSpy).not.toHaveBeenCalled();
  });

  it("should fix and rewrite invalid modinfo.json", async () => {
    const invalidJson = JSON.stringify({
      name: "BrokenMod",
    });
    const written: { path: string; data: unknown }[] = [];
    const deps = makeDeps({
      readFile: async () => invalidJson,
      writeJson: async (p: string, data: unknown) => {
        written.push({ path: p, data });
      },
    });

    const result = await processModInfo("/library/BrokenMod", deps);

    expect(result.name).toBe("BrokenMod");
    expect(result.title).toBe("BrokenMod");
    expect(written.length).toBe(1);
    expect(written[0].path).toBe("/library/BrokenMod/modinfo.json");
  });

  it("should create default modinfo.json when it does not exist", async () => {
    const writeJsonSpy = vi.fn(async () => {});
    const deps = makeDeps({
      pathExists: async (p: string) => !p.endsWith("modinfo.json"),
      writeJson: writeJsonSpy,
    });

    const result = await processModInfo("/library/NewMod", deps);

    expect(result.name).toBe("NewMod");
    expect(result.title).toBe("NewMod");
    expect(result.modType).toBe("Unknown");
    expect(result.description).toBe("");
    expect(writeJsonSpy).toHaveBeenCalledWith(
      expect.stringContaining("NewMod"),
      expect.objectContaining({ name: "NewMod" })
    );
  });

  it("should extract folder name correctly from Unix path", async () => {
    const deps = makeDeps({
      readFile: async () => JSON.stringify({ name: "X", title: "X" }),
    });
    const result = await processModInfo("/home/user/mods/CoolMod", deps);
    expect(result.name).toBe("CoolMod");
  });

  it("should extract folder name correctly from Windows path", async () => {
    const deps = makeDeps({
      readFile: async () => JSON.stringify({ name: "X", title: "X" }),
    });
    const result = await processModInfo("C:\\Users\\Tian\\Desktop\\library\\CoolMod", deps);
    expect(result.name).toBe("CoolMod");
  });

  it("should handle modinfo.json with invalid JSON gracefully", async () => {
    const deps = makeDeps({
      readFile: async () => "not valid json {{{",
    });
    await expect(processModInfo("/library/BadJson", deps)).rejects.toThrow();
  });
});

describe("loadLibrary", () => {
  it("should return empty array when library path is null", async () => {
    const deps = makeDeps({ getLibraryPath: () => null });
    const result = await loadLibrary(deps);
    expect(result).toEqual([]);
  });

  it("should return empty array when library path does not exist", async () => {
    const deps = makeDeps({
      pathExists: async () => false,
    });
    const result = await loadLibrary(deps);
    expect(result).toEqual([]);
  });

  it("should load mods sorted by mtime descending", async () => {
    const deps = makeDeps({
      readdir: async () => [
        { name: "ModA", isDirectory: () => true },
        { name: "ModB", isDirectory: () => true },
        { name: "notamod.txt", isDirectory: () => false },
      ],
      stat: async (p: string) => {
        if (p.includes("ModA")) return { mtime: new Date("2025-01-01") };
        if (p.includes("ModB")) return { mtime: new Date("2025-06-01") };
        return { mtime: new Date("2025-01-01") };
      },
      readFile: async (p: string) => {
        if (p.includes("ModA")) return JSON.stringify({ name: "ModA", title: "A" });
        if (p.includes("ModB")) return JSON.stringify({ name: "ModB", title: "B" });
        return "{}";
      },
    });

    const result = await loadLibrary(deps);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("ModB"); // newer first
    expect(result[1].name).toBe("ModA");
  });

  it("should skip folders that error and continue processing others", async () => {
    const logErrors: string[] = [];
    const deps = makeDeps({
      readdir: async () => [
        { name: "GoodMod", isDirectory: () => true },
        { name: "BadMod", isDirectory: () => true },
      ],
      stat: async (p: string) => {
        if (p.includes("BadMod")) throw new Error("stat failed");
        return { mtime: new Date("2025-01-01") };
      },
      readFile: async (p: string) => {
        if (p.includes("GoodMod")) return JSON.stringify({ name: "GoodMod", title: "Good" });
        return "{}";
      },
      logError: (msg: string) => {
        logErrors.push(msg);
      },
    });

    const result = await loadLibrary(deps);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("GoodMod");
    expect(logErrors.length).toBeGreaterThanOrEqual(1);
    expect(logErrors.some((m) => m.includes("BadMod"))).toBe(true);
  });
});

describe("deleteMod", () => {
  it("should return false when library path is null", async () => {
    const deps = makeDeps({ getLibraryPath: () => null });
    const result = await deleteMod("SomeMod", deps);
    expect(result).toBe(false);
  });

  it("should return false when target path is null", async () => {
    const deps = makeDeps({ getTargetPath: () => null });
    const result = await deleteMod("SomeMod", deps);
    expect(result).toBe(false);
  });

  it("should return false when library path does not exist", async () => {
    const deps = makeDeps({ pathExists: async (p) => p !== "/library" });
    const result = await deleteMod("SomeMod", deps);
    expect(result).toBe(false);
  });

  it("should delete mod from both library and target paths", async () => {
    const removed: string[] = [];
    const deps = makeDeps({
      remove: async (p: string) => {
        removed.push(p);
      },
    });

    const result = await deleteMod("MyMod", deps);

    expect(result).toBe(true);
    expect(removed).toContain("/library/MyMod");
    expect(removed).toContain("/target/MyMod");
  });

  it("should return false when remove fails", async () => {
    const logErrors: string[] = [];
    const deps = makeDeps({
      remove: async () => {
        throw new Error("permission denied");
      },
      logError: (msg: string) => {
        logErrors.push(msg);
      },
    });

    const result = await deleteMod("MyMod", deps);

    expect(result).toBe(false);
    expect(logErrors.length).toBe(1);
    expect(logErrors[0]).toContain("Error deleting mod");
  });
});
