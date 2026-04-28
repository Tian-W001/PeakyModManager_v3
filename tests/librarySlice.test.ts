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
  setLibraryPath,
  setTargetPath,
  setD3dxUserPath,
  loadLibrary,
} from "../src/renderer/src/redux/slices/librarySlice";
import { ModInfo } from "../src/shared/modInfo";

const makeMod = (overrides: Partial<ModInfo> = {}): ModInfo => ({
  name: "TestMod",
  title: "TestMod",
  modType: "Unknown" as const,
  description: "",
  source: "",
  coverImage: "",
  ...overrides,
});

function createLibraryStore() {
  return configureStore({
    reducer: { library: libraryReducer },
    middleware: (gm) =>
      gm({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }),
  });
}

describe("librarySlice - reducers", () => {
  let store: ReturnType<typeof createLibraryStore>;

  beforeEach(() => {
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

  it("editModInfo: should merge partial fields", () => {
    store.dispatch(addModInfo(makeMod({ name: "A", description: "old" })));
    store.dispatch(editModInfo({ modName: "A", newModInfo: { description: "new" } }));
    const mod = selectModByName("A")(store.getState());
    expect(mod?.description).toBe("new");
    expect(mod?.name).toBe("A");
  });

  it("editModInfo: should be no-op for nonexistent mod", () => {
    store.dispatch(editModInfo({ modName: "X", newModInfo: { description: "nope" } }));
    expect(selectModInfos(store.getState())).toHaveLength(0);
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
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" } as ModInfo)));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "UI" } as ModInfo)));
    store.dispatch(addModInfo(makeMod({ name: "C", modType: "UI" } as ModInfo)));
    expect(selectModByType("UI")(store.getState())).toHaveLength(2);
    expect(selectModByType("Character")(store.getState())).toHaveLength(1);
    expect(selectModByType("Unknown")(store.getState())).toHaveLength(0);
  });

  it("selectModByCharacter: should filter character mods", () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" } as ModInfo)));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "Character", character: "Nicole" } as ModInfo)));
    store.dispatch(addModInfo(makeMod({ name: "C", modType: "UI" } as ModInfo)));
    expect(selectModByCharacter("Ellen")(store.getState())).toHaveLength(1);
    expect(selectModByCharacter("Nicole")(store.getState())).toHaveLength(1);
  });
});
