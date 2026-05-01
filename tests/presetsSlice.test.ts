import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import libraryReducer from "../src/renderer/src/redux/slices/librarySlice";
import uiReducer from "../src/renderer/src/redux/slices/uiSlice";
import presetsReducer, {
  addPreset,
  removePreset,
  setPresets,
  setCurrentPreset,
  applyMods,
  renamePreset,
  removeModFromAllPresets,
  addToDiffList,
  clearDiffList,
  selectAllPresets,
  selectAllPresetNames,
  selectCurrentPresetName,
  selectCurrentPresetMods,
  selectModIsEnabled,
  selectDiffList,
  selectModDiffState,
} from "../src/renderer/src/redux/slices/presetsSlice";

function createPresetStore() {
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

describe("presetsSlice - reducer", () => {
  let store: ReturnType<typeof createPresetStore>;

  beforeEach(() => {
    store = createPresetStore();
  });

  it("should have default preset on init", () => {
    expect(selectAllPresets(store.getState())).toEqual({ "Default Preset": [] });
    expect(selectCurrentPresetName(store.getState())).toBe("Default Preset");
  });

  it("addPreset: should add a new empty preset", () => {
    store.dispatch(addPreset("My Preset"));
    expect(selectAllPresets(store.getState())).toHaveProperty("My Preset");
    expect(selectAllPresets(store.getState())["My Preset"]).toEqual([]);
  });

  it("addPreset: should ignore duplicate preset name", () => {
    store.dispatch(addPreset("My Preset"));
    store.dispatch(addPreset("My Preset"));
    expect(Object.keys(selectAllPresets(store.getState()))).toEqual(["Default Preset", "My Preset"]);
  });

  it("removePreset: should delete a preset", () => {
    store.dispatch(addPreset("Extra"));
    store.dispatch(removePreset("Extra"));
    expect(selectAllPresets(store.getState())).not.toHaveProperty("Extra");
  });

  it("removePreset: should not delete Default Preset", () => {
    store.dispatch(removePreset("Default Preset"));
    expect(selectAllPresets(store.getState())).toHaveProperty("Default Preset");
  });

  it("removePreset: should switch to Default if current is removed", () => {
    store.dispatch(addPreset("Active"));
    store.dispatch(setCurrentPreset("Active"));
    store.dispatch(removePreset("Active"));
    expect(selectCurrentPresetName(store.getState())).toBe("Default Preset");
  });

  it("setPresets: should replace all presets and ensure Default exists", () => {
    store.dispatch(setPresets({ "Custom A": ["m1", "m2"], "Custom B": ["m3"] }));
    const presets = selectAllPresets(store.getState());
    expect(presets["Custom A"]).toEqual(["m1", "m2"]);
    expect(presets["Custom B"]).toEqual(["m3"]);
    expect(presets["Default Preset"]).toEqual([]);
  });

  it("setPresets: should switch to Default if current no longer exists", () => {
    store.dispatch(addPreset("Test"));
    store.dispatch(setCurrentPreset("Test"));
    store.dispatch(setPresets({}));
    expect(selectCurrentPresetName(store.getState())).toBe("Default Preset");
  });

  it("renamePreset: should rename and update currentPresetName", () => {
    store.dispatch(addPreset("Old"));
    store.dispatch(setCurrentPreset("Old"));
    store.dispatch(renamePreset({ oldName: "Old", newName: "New" }));
    expect(selectAllPresets(store.getState())).toHaveProperty("New");
    expect(selectAllPresets(store.getState())).not.toHaveProperty("Old");
    expect(selectCurrentPresetName(store.getState())).toBe("New");
  });

  it("renamePreset: should not rename Default Preset", () => {
    store.dispatch(renamePreset({ oldName: "Default Preset", newName: "X" }));
    expect(selectAllPresets(store.getState())).toHaveProperty("Default Preset");
    expect(selectAllPresets(store.getState())).not.toHaveProperty("X");
  });

  it("renamePreset: should not overwrite existing preset", () => {
    store.dispatch(addPreset("A"));
    store.dispatch(addPreset("B"));
    store.dispatch(renamePreset({ oldName: "A", newName: "B" }));
    expect(selectAllPresets(store.getState())).toHaveProperty("A");
    expect(selectAllPresets(store.getState())).toHaveProperty("B");
  });
});

describe("presetsSlice - diffList, applyMods, removeModFromAllPresets", () => {
  let store: ReturnType<typeof createPresetStore>;

  beforeEach(() => {
    store = createPresetStore();
  });

  it("addToDiffList: should add new entries", () => {
    store.dispatch(addToDiffList({ modA: true }));
    expect(selectDiffList(store.getState())).toEqual({ modA: true });
  });

  it("addToDiffList: should toggle off existing diff entry", () => {
    store.dispatch(addToDiffList({ modA: true }));
    store.dispatch(addToDiffList({ modA: false }));
    expect(selectDiffList(store.getState())).toEqual({});
  });

  it("addToDiffList: should keep unchanged entries", () => {
    store.dispatch(addToDiffList({ modA: true }));
    store.dispatch(addToDiffList({ modA: true }));
    expect(selectDiffList(store.getState())).toEqual({ modA: true });
  });

  it("clearDiffList: should empty the diff list", () => {
    store.dispatch(addToDiffList({ modA: true, modB: false }));
    store.dispatch(clearDiffList());
    expect(selectDiffList(store.getState())).toEqual({});
  });

  it("applyMods: should add mods to current preset", () => {
    store.dispatch(applyMods({ modA: true, modB: true }));
    expect(selectCurrentPresetMods(store.getState())).toContain("modA");
    expect(selectCurrentPresetMods(store.getState())).toContain("modB");
  });

  it("applyMods: should remove mods from current preset", () => {
    store.dispatch(applyMods({ modA: true }));
    store.dispatch(applyMods({ modA: false }));
    expect(selectCurrentPresetMods(store.getState())).not.toContain("modA");
  });

  it("setCurrentPreset: should load target preset mods into diffList and clear the preset", () => {
    store.dispatch(applyMods({ modA: true }));
    store.dispatch(addPreset("RichPreset"));
    store.dispatch(clearDiffList());

    // Switch back: Default Preset's modA goes to diffList, Default is cleared
    store.dispatch(setCurrentPreset("Default Preset"));
    const diff = selectDiffList(store.getState());
    expect(diff["modA"]).toBe(true);
    expect(selectCurrentPresetMods(store.getState())).toEqual([]);
  });

  it("removeModFromAllPresets: should remove from all presets and diffList", () => {
    store.dispatch(applyMods({ modA: true }));
    store.dispatch(addToDiffList({ modA: true }));
    store.dispatch(removeModFromAllPresets("modA"));
    expect(selectCurrentPresetMods(store.getState())).not.toContain("modA");
    expect(selectDiffList(store.getState())).not.toHaveProperty("modA");
  });
});

describe("presetsSlice - selectors", () => {
  let store: ReturnType<typeof createPresetStore>;

  beforeEach(() => {
    store = createPresetStore();
  });

  it("selectAllPresetNames: should return preset names", () => {
    store.dispatch(addPreset("Alpha"));
    store.dispatch(addPreset("Beta"));
    expect(selectAllPresetNames(store.getState())).toEqual(["Default Preset", "Alpha", "Beta"]);
  });

  it("selectModIsEnabled: should return true for enabled mod", () => {
    store.dispatch(applyMods({ testMod: true }));
    expect(selectModIsEnabled("testMod")(store.getState())).toBe(true);
    expect(selectModIsEnabled("nonexistent")(store.getState())).toBe(false);
  });

  it("selectModDiffState: should return diff value or null", () => {
    store.dispatch(addToDiffList({ pending: true }));
    expect(selectModDiffState("pending")(store.getState())).toBe(true);
    expect(selectModDiffState("other")(store.getState())).toBeNull();
  });
});
