import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import libraryReducer, {
  addModInfo,
  removeModInfo,
  selectModInfos,
} from "../src/renderer/src/redux/slices/librarySlice";
import uiReducer from "../src/renderer/src/redux/slices/uiSlice";
import presetsReducer, {
  addPreset,
  setCurrentPreset,
  applyMods,
  addToDiffList,
  clearDiffList,
  removeModFromAllPresets,
  selectAllPresets,
  selectCurrentPresetMods,
  selectDiffList,
} from "../src/renderer/src/redux/slices/presetsSlice";
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

function createStore() {
  return configureStore({
    reducer: {
      library: libraryReducer,
      ui: uiReducer,
      presets: presetsReducer,
    },
    middleware: (gm) =>
      gm({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }),
  });
}

describe("E2E: Import → Enable → Apply → Switch Preset → Delete", () => {
  let store: ReturnType<typeof createStore>;
  let modA: ModInfo;
  let modB: ModInfo;

  beforeEach(() => {
    store = createStore();
    modA = makeMod({ name: "ModAlpha", modType: "Character", character: "Ellen" });
    modB = makeMod({ name: "ModBeta", modType: "UI" });
  });

  it("full lifecycle: import, enable, apply, switch preset, delete", () => {
    // 1. Import two mods
    store.dispatch(addModInfo(modA));
    store.dispatch(addModInfo(modB));
    expect(selectModInfos(store.getState())).toHaveLength(2);

    // 2. Mark mods as will-enable via diffList
    store.dispatch(addToDiffList({ ModAlpha: true, ModBeta: true }));
    expect(selectDiffList(store.getState())).toEqual({ ModAlpha: true, ModBeta: true });

    // 3. Apply changes (confirmed by user)
    store.dispatch(applyMods({ ModAlpha: true, ModBeta: true }));
    store.dispatch(clearDiffList());
    expect(selectDiffList(store.getState())).toEqual({});
    expect(selectCurrentPresetMods(store.getState())).toContain("ModAlpha");
    expect(selectCurrentPresetMods(store.getState())).toContain("ModBeta");

    // 4. Create and switch to a new preset, apply different config
    store.dispatch(addPreset("Gaming Preset"));
    store.dispatch(setCurrentPreset("Gaming Preset"));
    store.dispatch(applyMods({ ModAlpha: true }));
    store.dispatch(clearDiffList());
    expect(selectCurrentPresetMods(store.getState())).toContain("ModAlpha");
    expect(selectCurrentPresetMods(store.getState())).not.toContain("ModBeta");

    // 5. Delete a mod and verify it's gone from library & presets
    store.dispatch(removeModInfo("ModAlpha"));
    store.dispatch(removeModFromAllPresets("ModAlpha"));
    expect(selectModInfos(store.getState())).toHaveLength(1);
    expect(selectCurrentPresetMods(store.getState())).not.toContain("ModAlpha");
  });

  it("should handle disable (toggle on → off) via diffList", () => {
    store.dispatch(addModInfo(modA));
    store.dispatch(applyMods({ ModAlpha: true }));

    // Toggle off
    store.dispatch(addToDiffList({ ModAlpha: false }));
    store.dispatch(applyMods({ ModAlpha: false }));

    expect(selectCurrentPresetMods(store.getState())).not.toContain("ModAlpha");
  });

  it("should preserve mods in old preset after switching", () => {
    store.dispatch(addModInfo(modA));
    store.dispatch(applyMods({ ModAlpha: true }));
    store.dispatch(addPreset("Second"));
    store.dispatch(setCurrentPreset("Second"));
    store.dispatch(applyMods({ ModBeta: true }));
    store.dispatch(clearDiffList());

    // "Default Preset" should still have ModAlpha
    const presets = selectAllPresets(store.getState());
    expect(presets["Default Preset"]).toEqual(["ModAlpha"]);
    expect(presets["Second"]).toEqual(["ModBeta"]);
  });
});
