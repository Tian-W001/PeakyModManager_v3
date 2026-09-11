import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

vi.stubGlobal("window", {
  electron: {
    ipcRenderer: {
      invoke: vi.fn().mockResolvedValue(true),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      send: vi.fn(),
    },
  },
});

import libraryReducer, {
  addModInfo,
  removeModInfo,
  editModInfo,
  selectModInfos,
  selectLibraryPath,
  selectTargetPath,
  selectD3dxUserPath,
  selectModByName,
  selectModByType,
  selectModByCharacter,
  refreshLibraryAfterUpdate,
  setLibraryPath,
} from "../src/renderer/src/redux/slices/librarySlice";
import uiReducer from "../src/renderer/src/redux/slices/uiSlice";
import presetsReducer from "../src/renderer/src/redux/slices/presetsSlice";
import { ModInfo } from "../src/shared/modInfo";

const makeMod = (overrides: Partial<ModInfo> = {}): ModInfo =>
  ({
    name: "TestMod",
    title: "TestMod",
    modType: "Unknown",
    description: "",
    source: "",
    coverImage: "",
    ...overrides,
  }) as ModInfo;

function createLibraryStore() {
  return configureStore({
    reducer: { library: libraryReducer, ui: uiReducer, presets: presetsReducer },
    middleware: (gm) =>
      gm({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }),
  });
}

describe("refresh library after an update", () => {
  const setup = () => {
    const store = createLibraryStore();
    store.dispatch(setLibraryPath.fulfilled("/library", "setup", "/library"));
    store.dispatch(addModInfo(makeMod({ name: "Cached", modType: "Character", character: "Belle" })));
    return store;
  };
  const refreshed = makeMod({ name: "Cached", modType: "Character", character: "Belle", outfitId: 0 });

  beforeEach(() => {
    vi.mocked(window.electron.ipcRenderer.invoke).mockReset();
    vi.mocked(window.electron.ipcRenderer.invoke).mockImplementation(async (channel) => {
      if (channel === "get-app-version") return "2.0.0";
      if (channel === "load-library") return [refreshed];
      throw new Error(`Unexpected channel: ${channel}`);
    });
  });

  it("refreshes old caches without a version marker and saves normalized mods", async () => {
    const store = setup();
    await store.dispatch(refreshLibraryAfterUpdate());
    expect(store.getState().library.lastRefreshedVersion).toBe("2.0.0");
    expect(store.getState().library.modInfos).toEqual([refreshed]);
    expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith("load-library", true);
  });

  it("skips the same version after persisted cache restoration, but refreshes a new version", async () => {
    const store = setup();
    await store.dispatch(refreshLibraryAfterUpdate());
    const restarted = createLibraryStore();
    restarted.dispatch({ type: "persist/REHYDRATE", key: "library", payload: store.getState().library });
    vi.mocked(window.electron.ipcRenderer.invoke).mockClear();
    await restarted.dispatch(refreshLibraryAfterUpdate());
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalledWith("load-library", true);
    vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValueOnce("2.1.0");
    await restarted.dispatch(refreshLibraryAfterUpdate());
    expect(restarted.getState().library.lastRefreshedVersion).toBe("2.1.0");
    expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith("load-library", true);
  });

  it("preserves cache and version on failure and retries later", async () => {
    const store = setup();
    const previous = store.getState().library;
    vi.mocked(window.electron.ipcRenderer.invoke)
      .mockResolvedValueOnce("2.0.0")
      .mockRejectedValueOnce(new Error("Library offline"));
    const result = await store.dispatch(refreshLibraryAfterUpdate());
    expect(refreshLibraryAfterUpdate.rejected.match(result)).toBe(true);
    expect(store.getState().library).toEqual(previous);
    await store.dispatch(refreshLibraryAfterUpdate());
    expect(store.getState().library.lastRefreshedVersion).toBe("2.0.0");
  });

  it("accepts a successfully loaded empty library", async () => {
    const store = setup();
    vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValueOnce("2.0.0").mockResolvedValueOnce([]);
    await store.dispatch(refreshLibraryAfterUpdate());
    expect(store.getState().library.modInfos).toEqual([]);
    expect(store.getState().library.lastRefreshedVersion).toBe("2.0.0");
  });

  it("skips unconfigured libraries without recording completion", async () => {
    const store = createLibraryStore();
    await store.dispatch(refreshLibraryAfterUpdate());
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(store.getState().library.lastRefreshedVersion).toBeNull();
  });

  it("does not apply a completed scan to a different library", async () => {
    const store = setup();
    const refresh = store.dispatch(refreshLibraryAfterUpdate());
    store.dispatch(setLibraryPath.fulfilled("/another", "switch", "/another"));
    await refresh;
    expect(store.getState().library.lastRefreshedVersion).toBeNull();
    expect(store.getState().library.modInfos[0].outfitId).toBeUndefined();
  });
});

describe("librarySlice - reducers", () => {
  let store: ReturnType<typeof createLibraryStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electron.ipcRenderer.invoke).mockImplementation(async (_channel, _name, modInfo) => modInfo);
    store = createLibraryStore();
  });

  it("addModInfo: should push mod to head", () => {
    store.dispatch(addModInfo(makeMod({ name: "A" })));
    store.dispatch(addModInfo(makeMod({ name: "B" })));
    const mods = selectModInfos(store.getState());
    expect(mods[0].name).toBe("B");
    expect(mods[1].name).toBe("A");
  });

  it("removeModInfo: should remove by name", () => {
    store.dispatch(addModInfo(makeMod({ name: "A" })));
    store.dispatch(addModInfo(makeMod({ name: "B" })));
    store.dispatch(removeModInfo("A"));
    const mods = selectModInfos(store.getState());
    expect(mods).toHaveLength(1);
    expect(mods[0].name).toBe("B");
  });

  it("removeModInfo: should be no-op for nonexistent mod", () => {
    store.dispatch(addModInfo(makeMod({ name: "A" })));
    store.dispatch(removeModInfo("X"));
    expect(selectModInfos(store.getState())).toHaveLength(1);
  });

  it("editModInfo: should merge partial fields", async () => {
    store.dispatch(addModInfo(makeMod({ name: "A", description: "old" })));
    await store.dispatch(editModInfo({ modName: "A", newModInfo: { description: "new" } }));
    const mod = selectModByName("A")(store.getState());
    expect(mod?.description).toBe("new");
    expect(mod?.name).toBe("A");
    expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith("edit-mod-info", "A", {
      ...makeMod({ name: "A", description: "new" }),
    });
  });

  it("editModInfo: should be no-op for nonexistent mod", async () => {
    await store.dispatch(editModInfo({ modName: "X", newModInfo: { description: "nope" } }));
    expect(selectModInfos(store.getState())).toHaveLength(0);
    expect(window.electron.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it("editModInfo: stores the normalized outfit returned by the main process", async () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Belle", outfitId: 1 })));
    const saved = makeMod({ name: "A", modType: "Character", character: "Anby", outfitId: 0 });
    vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValueOnce(saved);
    await store.dispatch(editModInfo({ modName: "A", newModInfo: { character: "Anby", outfitId: 1 } }));
    expect(selectModByName("A")(store.getState())).toEqual(saved);
  });

  it("editModInfo: leaves the library unchanged when saving fails", async () => {
    const original = makeMod({ name: "A", modType: "Character", character: "Belle", outfitId: 0 });
    store.dispatch(addModInfo(original));
    vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValueOnce(null);
    const result = await store.dispatch(editModInfo({ modName: "A", newModInfo: { outfitId: 1 } }));
    expect(editModInfo.rejected.match(result)).toBe(true);
    expect(selectModByName("A")(store.getState())).toEqual(original);
  });
});

describe("librarySlice - selectors", () => {
  let store: ReturnType<typeof createLibraryStore>;

  beforeEach(() => {
    store = createLibraryStore();
  });

  it("selectLibraryPath / selectTargetPath / selectD3dxUserPath: should be null initially", () => {
    expect(selectLibraryPath(store.getState())).toBeNull();
    expect(selectTargetPath(store.getState())).toBeNull();
    expect(selectD3dxUserPath(store.getState())).toBeNull();
  });

  it("selectModByName: should find mod by name", () => {
    store.dispatch(addModInfo(makeMod({ name: "FindMe" })));
    expect(selectModByName("FindMe")(store.getState())?.name).toBe("FindMe");
    expect(selectModByName("Nope")(store.getState())).toBeUndefined();
  });

  it("selectModByType: should filter by type", () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" })));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "UI" })));
    store.dispatch(addModInfo(makeMod({ name: "C", modType: "UI" })));
    expect(selectModByType("UI")(store.getState())).toHaveLength(2);
    expect(selectModByType("Character")(store.getState())).toHaveLength(1);
    expect(selectModByType("Unknown")(store.getState())).toHaveLength(0);
  });

  it("selectModByCharacter: should filter character mods", () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" })));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "Character", character: "Nicole" })));
    store.dispatch(addModInfo(makeMod({ name: "C", modType: "UI" })));
    expect(selectModByCharacter("Ellen")(store.getState())).toHaveLength(1);
    expect(selectModByCharacter("Nicole")(store.getState())).toHaveLength(1);
  });
});
