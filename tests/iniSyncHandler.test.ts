import path from "path";
import { describe, expect, it } from "vitest";
import {
  changeKeyBinding,
  changeToggleState,
  findAllTogglesInD3dxUser,
  IniSyncDeps,
  syncToggles,
} from "../src/main/domain/iniSync";
import { threeDMigotoParser } from "../src/shared/threeDMigoto";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface TestFileSystem {
  files: Map<string, string>;
  writes: Array<{ path: string; content: string }>;
  deps: IniSyncDeps;
}

const makeFileSystem = (
  initialFiles: Record<string, string> = {},
  overrides: Partial<IniSyncDeps> = {}
): TestFileSystem => {
  const files = new Map(Object.entries(initialFiles));
  const writes: Array<{ path: string; content: string }> = [];
  const directories = new Set(["/library", "/library/TestMod"]);
  const resolveInside = (basePath: string, ...segments: string[]): string | null => {
    const target = path.posix.resolve(basePath, ...segments);
    const relative = path.posix.relative(path.posix.resolve(basePath), target);
    return relative === "" || (!relative.startsWith("..") && !path.posix.isAbsolute(relative)) ? target : null;
  };
  const isPathInside = (basePath: string, targetPath: string): boolean => {
    const relative = path.posix.relative(path.posix.resolve(basePath), path.posix.resolve(targetPath));
    return relative === "" || (!relative.startsWith("..") && !path.posix.isAbsolute(relative));
  };

  const deps: IniSyncDeps = {
    getD3dxUserPath: () => "/d3dx_user.ini",
    getLibraryPath: () => "/library",
    pathExists: async (filePath: string) => directories.has(filePath) || files.has(filePath),
    readFile: async (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) throw new Error(`ENOENT: ${filePath}`);
      return content;
    },
    replaceFile: async (filePath: string, content: string) => {
      writes.push({ path: filePath, content });
      files.set(filePath, content);
    },
    resolveInside,
    isPathInside,
    realpath: async (filePath: string) => filePath,
    pathExtname: (filePath: string) => path.posix.extname(filePath),
    escapeRegExp,
    ...overrides,
  };

  return { files, writes, deps };
};

describe("3DMigoto INI synchronization", () => {
  it("parses signed, decimal and nested runtime states through the parser", async () => {
    const fileSystem = makeFileSystem({
      "/d3dx_user.ini":
        "$/mods/TestMod/Part1.ini/ToggleA = -1\n" +
        "$\\mods\\TestMod\\SubFolder\\Part2.ini\\ToggleB = 2.5\n" +
        "$/mods/TestMod/Part1.ini/Invalid = foo + 1\n" +
        "$/mods/OtherMod/Part1.ini/ToggleC = 1\n",
    });

    await expect(findAllTogglesInD3dxUser("TestMod", fileSystem.deps)).resolves.toEqual({
      "Part1.ini": { ToggleA: "-1" },
      "SubFolder/Part2.ini": { ToggleB: "2.5" },
    });
  });

  it("syncs all matching persist variables once per file and reports stale entries", async () => {
    const fileSystem = makeFileSystem({
      "/d3dx_user.ini":
        "$/mods/TestMod/Part.ini/hair = -1\n" +
        "$/mods/TestMod/Part.ini/face = 2.5\n" +
        "$/mods/TestMod/Part.ini/unknown = 3\n" +
        "$/mods/TestMod/Missing.ini/ghost = 1\n",
      "/library/TestMod/Part.ini":
        "[Constants]\r\n" + "  global persist $hair = 0  \r\n" + "  global persist $face = 2.500\r\n",
    });

    const result = await syncToggles("TestMod", fileSystem.deps);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.changes).toEqual([
      {
        iniPath: "Part.ini",
        variableName: "$hair",
        previousValue: "0",
        newValue: "-1",
      },
    ]);
    expect(result.skipped.map((entry) => entry.reason)).toEqual(
      expect.arrayContaining(["variable-not-found", "ini-not-found"])
    );
    expect(fileSystem.writes).toHaveLength(1);
    expect(fileSystem.files.get("/library/TestMod/Part.ini")).toContain("  global persist $hair = -1  \r\n");
    expect(fileSystem.files.get("/library/TestMod/Part.ini")).toContain("  global persist $face = 2.500\r\n");
  });
});

describe("changeKeyBinding", () => {
  it("replaces all key and back bindings while preserving unrelated source", async () => {
    const fileSystem = makeFileSystem({
      "/library/TestMod/Part.ini":
        "[KeyHair]\r\n" +
        "key = H\r\n" +
        "key = J\r\n" +
        "back = K\r\n" +
        "; keep\r\n" +
        "type = cycle\r\n" +
        "$hair = 0, 1\r\n",
    });

    const result = await changeKeyBinding(
      {
        modName: "TestMod",
        iniPath: "Part.ini",
        keyBindingId: "hair",
        keys: ["VK_F1", "VK_F2", "VK_F3"],
        backKeys: [],
      },
      fileSystem.deps
    );

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      before: { keys: ["H", "J"], backKeys: ["K"] },
      after: { keys: ["VK_F1", "VK_F2", "VK_F3"], backKeys: [] },
    });
    expect(fileSystem.writes).toHaveLength(1);
    const updatedSource = fileSystem.files.get("/library/TestMod/Part.ini")!;
    expect(updatedSource).toContain("; keep\r\n");
    expect(threeDMigotoParser.parse(updatedSource).getKeyBinding("hair")).toMatchObject({
      keys: ["VK_F1", "VK_F2", "VK_F3"],
      backKeys: [],
    });
  });

  it("preserves back bindings when omitted and avoids equivalent writes", async () => {
    const source = "[KeyHair]\nkey = H\nback = K\ntype = cycle\n$hair = 0, 1\n";
    const fileSystem = makeFileSystem({ "/library/TestMod/Part.ini": source });

    const result = await changeKeyBinding(
      {
        modName: "TestMod",
        iniPath: "Part.ini",
        keyBindingId: "KeyHair",
        keys: ["H"],
      },
      fileSystem.deps
    );

    expect(result).toMatchObject({
      ok: true,
      changed: false,
      after: { keys: ["H"], backKeys: ["K"] },
    });
    expect(fileSystem.writes).toEqual([]);
  });

  it("rejects paths outside the selected Mod", async () => {
    const fileSystem = makeFileSystem();
    const result = await changeKeyBinding(
      {
        modName: "TestMod",
        iniPath: "../OtherMod/Part.ini",
        keyBindingId: "hair",
        keys: ["H"],
      },
      fileSystem.deps
    );

    expect(result).toMatchObject({ ok: false, code: "invalid-path" });
  });
});

describe("changeToggleState", () => {
  it("changes only the Mod INI default persistent state", async () => {
    const fileSystem = makeFileSystem({
      "/d3dx_user.ini": "$/mods/TestMod/Part.ini/hair = 5\n",
      "/library/TestMod/Part.ini": "[Constants]\n  global persist $hair = 0  \n",
    });

    const result = await changeToggleState(
      {
        modName: "TestMod",
        iniPath: "Part.ini",
        variableName: "hair",
        value: -1.5,
      },
      fileSystem.deps
    );

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      before: { variableName: "$hair", value: "0" },
      after: { variableName: "$hair", value: "-1.5" },
    });
    expect(fileSystem.files.get("/library/TestMod/Part.ini")).toContain("  global persist $hair = -1.5  \n");
    expect(fileSystem.files.get("/d3dx_user.ini")).toBe("$/mods/TestMod/Part.ini/hair = 5\n");
  });

  it("rejects non-finite values and ambiguous declarations", async () => {
    const invalidFileSystem = makeFileSystem({
      "/library/TestMod/Part.ini": "[Constants]\nglobal persist $hair = 0\n",
    });
    await expect(
      changeToggleState(
        {
          modName: "TestMod",
          iniPath: "Part.ini",
          variableName: "hair",
          value: Number.NaN,
        },
        invalidFileSystem.deps
      )
    ).resolves.toMatchObject({ ok: false, code: "invalid-request" });

    const ambiguousFileSystem = makeFileSystem({
      "/library/TestMod/Part.ini": "[Constants]\n" + "global persist $hair = 0\n" + "global persist $hair = 1\n",
    });
    await expect(
      changeToggleState(
        {
          modName: "TestMod",
          iniPath: "Part.ini",
          variableName: "$hair",
          value: 2,
        },
        ambiguousFileSystem.deps
      )
    ).resolves.toMatchObject({ ok: false, code: "target-ambiguous" });
  });

  it("detects external file changes before writing", async () => {
    const source = "[Constants]\nglobal persist $hair = 0\n";
    let reads = 0;
    const fileSystem = makeFileSystem(
      { "/library/TestMod/Part.ini": source },
      {
        readFile: async () => {
          reads += 1;
          return reads === 1 ? source : `${source}; external change\n`;
        },
      }
    );

    const result = await changeToggleState(
      {
        modName: "TestMod",
        iniPath: "Part.ini",
        variableName: "hair",
        value: 1,
      },
      fileSystem.deps
    );

    expect(result).toMatchObject({ ok: false, code: "conflict" });
    expect(fileSystem.writes).toEqual([]);
  });
});
