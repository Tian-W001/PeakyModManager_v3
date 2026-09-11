import { beforeEach, describe, expect, it, vi } from "vitest";
import { ipcMain, type IpcMainInvokeEvent } from "electron";
import fs from "fs-extra";
import { registerModInfoHandlers } from "../src/main/handlers/modInfoHandlers";

const fileMocks = vi.hoisted(() => ({
  pathExists: vi.fn<() => Promise<boolean>>(),
  writeJson: vi.fn<() => Promise<void>>(),
}));

vi.mock("electron", () => ({ ipcMain: { handle: vi.fn() } }));
vi.mock("fs-extra", () => ({ default: fileMocks }));
vi.mock("../src/main/services/storeService", () => ({ getLibraryPath: () => "/qa-library" }));

describe("edit-mod-info IPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileMocks.pathExists.mockResolvedValue(true);
    fileMocks.writeJson.mockResolvedValue(undefined);
    registerModInfoHandlers();
  });

  const save = async (info: Record<string, unknown>) => {
    const handler = vi.mocked(ipcMain.handle).mock.calls.find(([channel]) => channel === "edit-mod-info")?.[1];
    if (!handler) throw new Error("Missing edit-mod-info handler");
    return handler({} as IpcMainInvokeEvent, "OutfitMod", info);
  };

  it("writes and returns the same normalized metadata", async () => {
    const saved = await save({ modType: "Character", character: "Belle", outfitId: 1 });
    expect(saved).toMatchObject({ name: "OutfitMod", character: "Belle", outfitId: 1 });
    expect(fs.writeJson).toHaveBeenCalledWith(expect.stringContaining("modinfo.json"), saved, { spaces: 2 });
  });

  it("fills legacy metadata with outfit 0 before saving", async () => {
    const saved = await save({ modType: "Character", character: "Belle" });
    expect(saved).toMatchObject({ outfitId: 0 });
    expect(fs.writeJson).toHaveBeenCalledWith(expect.any(String), saved, { spaces: 2 });
  });

  it("returns null without writing when the library is unavailable", async () => {
    fileMocks.pathExists.mockResolvedValue(false);
    expect(await save({ modType: "Character", character: "Belle", outfitId: 1 })).toBeNull();
    expect(fs.writeJson).not.toHaveBeenCalled();
  });
});
