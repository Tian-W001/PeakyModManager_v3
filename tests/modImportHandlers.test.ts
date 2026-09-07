import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ipcMain } from "electron";
import fs from "fs-extra";
import { importMod } from "../src/main/domain/modImport";
import { getLibraryPath } from "../src/main/services/storeService";
import { registerImportHandlers } from "../src/main/handlers/modImportHandlers";

vi.mock("electron", () => ({
  app: { getPath: () => path.resolve("test-user-data") },
  ipcMain: { handle: vi.fn() },
  net: {},
}));
vi.mock("fs-extra", () => ({ default: { remove: vi.fn() } }));
vi.mock("../src/main/domain/modImport", () => ({ importMod: vi.fn(), importModCover: vi.fn() }));
vi.mock("../src/main/services/storeService", () => ({ getLibraryPath: vi.fn() }));
vi.mock("../src/main/services/windowService", () => ({ getMainWindow: vi.fn() }));

describe("extension import temporary directory cleanup", () => {
  const tempDir = path.resolve("test-user-data", "Mods", "TestMod");
  let handleImport: (event: unknown, sourcePath: string) => Promise<unknown>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getLibraryPath).mockReturnValue(path.resolve("test-library"));
    vi.mocked(importMod).mockResolvedValue(null);
    registerImportHandlers();
    handleImport = vi.mocked(ipcMain.handle).mock.calls.find(([channel]) => channel === "import-mod")![1];
  });

  it("keeps extracted files until import completes, then removes them", async () => {
    const modInfo = {
      name: "TestMod",
      title: "TestMod",
      description: "",
      source: "",
      coverImage: "",
      modType: "Unknown" as const,
    };
    let finish!: (value: Awaited<ReturnType<typeof importMod>>) => void;
    vi.mocked(importMod).mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const pending = handleImport({}, tempDir);
    expect(fs.remove).not.toHaveBeenCalled();
    finish(modInfo);
    await expect(pending).resolves.toBe(modInfo);
    expect(fs.remove).toHaveBeenCalledExactlyOnceWith(tempDir);
  });

  it("cleans up when import returns null (cancelled or failed)", async () => {
    await expect(handleImport({}, tempDir)).resolves.toBeNull();
    expect(fs.remove).toHaveBeenCalledExactlyOnceWith(tempDir);
  });

  it("cleans up when the import throws and preserves the original error", async () => {
    const error = new Error("Copy failed");
    vi.mocked(importMod).mockRejectedValue(error);
    await expect(handleImport({}, tempDir)).rejects.toBe(error);
    expect(fs.remove).toHaveBeenCalledExactlyOnceWith(tempDir);
  });

  it("cleans up when no library is configured", async () => {
    vi.mocked(getLibraryPath).mockReturnValue(null);
    await handleImport({}, tempDir);
    expect(fs.remove).toHaveBeenCalledExactlyOnceWith(tempDir);
  });

  it.each([
    path.resolve("downloads", "TestMod"),
    path.resolve("downloads", "TestMod.zip"),
    path.resolve("test-user-data", "Mods"),
    path.resolve("test-user-data", "Mods", "TestMod", "subfolder"),
  ])("preserves non-temporary sources: %s", async (sourcePath) => {
    await handleImport({}, sourcePath);
    expect(fs.remove).not.toHaveBeenCalled();
  });

  it.each([path.dirname(tempDir), tempDir, path.join(tempDir, "library")])(
    "preserves a temporary path that overlaps the library: %s",
    async (libraryPath) => {
      vi.mocked(getLibraryPath).mockReturnValue(libraryPath);
      await handleImport({}, tempDir);
      expect(fs.remove).not.toHaveBeenCalled();
    }
  );

  it("logs cleanup failures without changing the import result", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fs.remove).mockRejectedValue(new Error("Directory locked") as never);
    try {
      await expect(handleImport({}, tempDir)).resolves.toBeNull();
      expect(logError).toHaveBeenCalled();
    } finally {
      logError.mockRestore();
    }
  });
});
