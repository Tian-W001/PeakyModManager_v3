import { describe, it, expect, vi } from "vitest";
import { importMod, flattenSingleRootFolder, importModCover } from "../src/main/domain/modImport";
import { ModImportDeps, ModCoverDeps } from "../src/main/domain/modImport";
import { ModInfo } from "../src/shared/modInfo";

const sampleModInfo: ModInfo = {
  name: "MyMod",
  title: "My Mod",
  modType: "Misc",
  description: "A test mod",
  source: "",
  coverImage: "",
} as ModInfo;

const makeImportDeps = (overrides: Partial<ModImportDeps> = {}): ModImportDeps => ({
  getLibraryPath: () => "/library",
  getTempModDir: (modName: string) => `/temp/${modName}`,
  pathExists: async () => true,
  stat: async () => ({ isFile: () => false, isDirectory: () => true }),
  emptyDir: async () => {},
  copy: async () => {},
  remove: async () => {},
  rename: async () => {},
  move: async () => {},
  readdir: async () => [],
  isZippedFile: () => false,
  unzipFile: async () => {},
  sendToRenderer: () => {},
  onIpc: () => () => {},
  parsePathName: (p: string) => {
    const parts = p.replace(/\\/g, "/").split("/");
    const last = parts[parts.length - 1];
    const dotIdx = last.lastIndexOf(".");
    return dotIdx > 0 ? last.substring(0, dotIdx) : last;
  },
  pathJoin: (...args: string[]) => args.join("/"),
  log: () => {},
  readFile: async () => "{}",
  writeJson: async () => {},
  processModInfo: vi.fn(async (modPath: string) => ({
    ...sampleModInfo,
    name: modPath.split("/").pop() || modPath,
    title: modPath.split("/").pop() || modPath,
  })),
  ...overrides,
});

const makeCoverDeps = (overrides: Partial<ModCoverDeps> = {}): ModCoverDeps => ({
  getLibraryPath: () => "/library",
  pathExists: async () => true,
  pathJoin: (...args: string[]) => args.join("/"),
  pathRelative: (from: string, to: string) => to.replace(from + "/", ""),
  pathExtname: (p: string) => p.substring(p.lastIndexOf(".")),
  pathIsAbsolute: () => false,
  fetchUrl: async () => ({
    ok: true,
    headers: { get: () => "image/png" },
    arrayBuffer: async () => new ArrayBuffer(4),
  }),
  extensionFromMime: () => "png",
  writeFile: async () => {},
  copyFile: async () => {},
  logError: () => {},
  ...overrides,
});

describe("importMod", () => {
  it("should return null when library path is null", async () => {
    const deps = makeImportDeps({ getLibraryPath: () => null });
    const result = await importMod("/source/MyMod", deps);
    expect(result).toBeNull();
  });

  it("should return null when library path does not exist", async () => {
    const deps = makeImportDeps({
      pathExists: async (p: string) => p !== "/library",
    });
    const result = await importMod("/source/MyMod", deps);
    expect(result).toBeNull();
  });

  it("should return null when source stat fails", async () => {
    const deps = makeImportDeps({
      stat: async () => {
        throw new Error("ENOENT");
      },
    });
    const result = await importMod("/nonexistent/MyMod", deps);
    expect(result).toBeNull();
  });

  it("should return null when source is a non-zip file", async () => {
    const deps = makeImportDeps({
      stat: async () => ({ isFile: () => true, isDirectory: () => false }),
      isZippedFile: () => false,
    });
    const result = await importMod("/some/readme.txt", deps);
    expect(result).toBeNull();
  });

  it("should import a directory mod successfully", async () => {
    const copied: { src: string; dest: string }[] = [];
    const processModInfoSpy = vi.fn(async (_modPath: string) => ({
      name: "MyMod",
      title: "My Mod",
      modType: "Misc",
      description: "",
      source: "",
      coverImage: "",
    }));

    const deps = makeImportDeps({
      stat: async () => ({ isFile: () => false, isDirectory: () => true }),
      copy: async (src: string, dest: string) => {
        copied.push({ src, dest });
      },
      pathExists: async (p: string) => p !== "/library/MyMod",
      readdir: async () => [
        { name: "modinfo.json", isDirectory: () => false },
        { name: "preview.png", isDirectory: () => false },
      ],
      processModInfo: processModInfoSpy,
    });

    const result = await importMod("/source/MyMod", deps);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("MyMod");
    expect(copied).toHaveLength(1);
    expect(copied[0].src).toBe("/source/MyMod");
    expect(copied[0].dest).toBe("/library/MyMod");
    expect(processModInfoSpy).toHaveBeenCalledWith("/library/MyMod", expect.any(Object));
  });

  it("should import and unzip a zipped mod", async () => {
    const emptied: string[] = [];
    const copied: { src: string; dest: string }[] = [];
    const removed: string[] = [];
    const sentMessages: { channel: string; data: unknown }[] = [];

    const deps = makeImportDeps({
      parsePathName: () => "MyZippedMod",
      stat: async (p: string) => {
        if (p === "/source/MyZippedMod.zip") return { isFile: () => true, isDirectory: () => false };
        if (p === "/temp/MyZippedMod") return { isFile: () => false, isDirectory: () => true };
        return { isFile: () => false, isDirectory: () => false };
      },
      isZippedFile: () => true,
      pathExists: async (p: string) => {
        if (p === "/library/MyZippedMod") return false;
        if (p === "/temp/MyZippedMod") return true;
        return true;
      },
      emptyDir: async (p: string) => {
        emptied.push(p);
      },
      copy: async (src: string, dest: string) => {
        copied.push({ src, dest });
      },
      remove: async (p: string) => {
        removed.push(p);
      },
      readdir: async () => [],
      sendToRenderer: (channel: string, data: unknown) => {
        sentMessages.push({ channel, data });
      },
    });

    const result = await importMod("/source/MyZippedMod.zip", deps);

    expect(result).not.toBeNull();
    expect(emptied).toContain("/temp/MyZippedMod");
    expect(copied).toHaveLength(1);
    expect(copied[0].src).toBe("/temp/MyZippedMod");
    expect(copied[0].dest).toBe("/library/MyZippedMod");
    expect(removed).toContain("/temp/MyZippedMod");
    expect(sentMessages.some((m) => m.channel === "unzipping-mod")).toBe(true);
    expect(sentMessages.some((m) => m.channel === "unzip-mod-finish")).toBe(true);
  });

  it("should handle overwrite when user confirms", async () => {
    let onIpcCalled = false;
    let cleanupCalled = false;
    const deps = makeImportDeps({
      stat: async () => ({ isFile: () => false, isDirectory: () => true }),
      pathExists: async (p: string) => p !== "/source/MyMod",
      readdir: async () => [],
      onIpc: (_channel: string, handler: (...args: unknown[]) => void) => {
        onIpcCalled = true;
        handler(true);
        return () => {
          cleanupCalled = true;
        };
      },
    });

    const result = await importMod("/source/MyMod", deps);

    expect(onIpcCalled).toBe(true);
    expect(cleanupCalled).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("MyMod");
  });

  it("should handle overwrite when user declines", async () => {
    let onIpcCalled = false;
    let cleanupCalled = false;
    const deps = makeImportDeps({
      stat: async () => ({ isFile: () => false, isDirectory: () => true }),
      pathExists: async (p: string) => p !== "/source/MyMod",
      readdir: async () => [],
      onIpc: (_channel: string, handler: (...args: unknown[]) => void) => {
        onIpcCalled = true;
        handler(false);
        return () => {
          cleanupCalled = true;
        };
      },
    });

    const result = await importMod("/source/MyMod", deps);

    expect(onIpcCalled).toBe(true);
    expect(cleanupCalled).toBe(true);
    expect(result).toBeNull();
  });

  it("should cancel overwrite when confirmation times out", async () => {
    let cleanupCalled = false;
    const deps = makeImportDeps({
      stat: async () => ({ isFile: () => false, isDirectory: () => true }),
      pathExists: async (p: string) => p !== "/source/MyMod",
      readdir: async () => [],
      overwriteTimeoutMs: 1,
      onIpc: () => {
        return () => {
          cleanupCalled = true;
        };
      },
    });

    const result = await importMod("/source/MyMod", deps);

    expect(cleanupCalled).toBe(true);
    expect(result).toBeNull();
  });
});

describe("flattenSingleRootFolder", () => {
  it("should do nothing when folder has multiple entries", async () => {
    const deps = makeImportDeps({
      readdir: async () => [
        { name: "folder1", isDirectory: () => true },
        { name: "folder2", isDirectory: () => true },
      ],
    });

    await flattenSingleRootFolder("/some/path", deps);
    // Should not call rename or move
  });

  it("should do nothing when single entry is a file", async () => {
    const deps = makeImportDeps({
      readdir: async () => [{ name: "readme.txt", isDirectory: () => false }],
    });

    await flattenSingleRootFolder("/some/path", deps);
    // Should not call rename or move
  });

  it("should flatten single subdirectory into parent", async () => {
    const renames: { old: string; new: string }[] = [];
    const moves: { src: string; dest: string }[] = [];
    const removals: string[] = [];

    const deps = makeImportDeps({
      readdir: async (p: string) => {
        if (p === "/library/MyMod") {
          return [{ name: "InnerFolder", isDirectory: () => true }];
        }
        // After rename: tmp_InnerFolder contents
        if (p.includes("tmp_InnerFolder")) {
          return [
            { name: "modinfo.json", isDirectory: () => false },
            { name: "preview.png", isDirectory: () => false },
          ];
        }
        return [];
      },
      rename: async (oldPath: string, newPath: string) => {
        renames.push({ old: oldPath, new: newPath });
      },
      move: async (src: string, dest: string) => {
        moves.push({ src, dest });
      },
      remove: async (p: string) => {
        removals.push(p);
      },
    });

    await flattenSingleRootFolder("/library/MyMod", deps);

    expect(renames).toHaveLength(1);
    expect(renames[0].old).toBe("/library/MyMod/InnerFolder");
    expect(renames[0].new).toBe("/library/MyMod/tmp_InnerFolder");
    expect(moves).toHaveLength(2);
    expect(removals).toHaveLength(1);
    expect(removals[0]).toBe("/library/MyMod/tmp_InnerFolder");
  });

  it("should do nothing when folder is empty", async () => {
    const deps = makeImportDeps({
      readdir: async () => [],
    });

    await flattenSingleRootFolder("/some/path", deps);
    // Should not throw or call anything
  });
});

describe("importModCover", () => {
  it("should return null when library path is null", async () => {
    const deps = makeCoverDeps({ getLibraryPath: () => null });
    const result = await importModCover("MyMod", "https://example.com/cover.png", deps);
    expect(result).toBeNull();
  });

  it("should download cover from URL", async () => {
    const writes: { path: string; data: Buffer }[] = [];
    const deps = makeCoverDeps({
      fetchUrl: async () => ({
        ok: true,
        headers: { get: () => "image/png" },
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
      writeFile: async (p: string, data: Buffer) => {
        writes.push({ path: p, data });
      },
    });

    const result = await importModCover("MyMod", "https://example.com/cover.png", deps);

    expect(result).toBe("preview.png");
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe("/library/MyMod/preview.png");
  });

  it("should return null when URL fetch fails", async () => {
    const deps = makeCoverDeps({
      fetchUrl: async () => {
        throw new Error("network error");
      },
    });

    const result = await importModCover("MyMod", "https://bad.url/image.png", deps);
    expect(result).toBeNull();
  });

  it("should return null when response is not ok", async () => {
    const deps = makeCoverDeps({
      fetchUrl: async () => ({
        ok: false,
        headers: { get: () => "image/png" },
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    });

    const result = await importModCover("MyMod", "https://example.com/404.png", deps);
    expect(result).toBeNull();
  });

  it("should return null when content type is not an image", async () => {
    const deps = makeCoverDeps({
      fetchUrl: async () => ({
        ok: true,
        headers: { get: () => "text/html" },
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    });

    const result = await importModCover("MyMod", "https://example.com/page.html", deps);
    expect(result).toBeNull();
  });

  it("should return null when URL is not http or https", async () => {
    const deps = makeCoverDeps();

    const result = await importModCover("MyMod", "ftp://example.com/cover.png", deps);

    expect(result).toBeNull();
  });

  it("should return null when remote image is too large", async () => {
    const deps = makeCoverDeps({
      fetchUrl: async () => ({
        ok: true,
        headers: { get: (key: string) => (key === "content-length" ? `${11 * 1024 * 1024}` : "image/png") },
        arrayBuffer: async () => new ArrayBuffer(4),
      }),
    });

    const result = await importModCover("MyMod", "https://example.com/large.png", deps);

    expect(result).toBeNull();
  });

  it("should copy local cover file into mod folder", async () => {
    const copies: { src: string; dest: string }[] = [];
    const deps = makeCoverDeps({
      pathIsAbsolute: () => true,
      pathRelative: () => "../outside/pic.png",
      copyFile: async (src: string, dest: string) => {
        copies.push({ src, dest });
      },
    });

    const result = await importModCover("MyMod", "/external/pic.jpg", deps);

    expect(result).toBe("preview.jpg");
    expect(copies).toHaveLength(1);
    expect(copies[0].src).toBe("/external/pic.jpg");
    expect(copies[0].dest).toBe("/library/MyMod/preview.jpg");
  });

  it("should return relative path for already-internal image", async () => {
    const deps = makeCoverDeps({
      pathRelative: () => "preview.png",
      pathIsAbsolute: () => false,
    });

    const result = await importModCover("MyMod", "/library/MyMod/preview.png", deps);

    expect(result).toBe("preview.png");
  });
});
