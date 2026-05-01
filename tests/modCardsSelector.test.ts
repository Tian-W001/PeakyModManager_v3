import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import libraryReducer, { addModInfo } from "../src/renderer/src/redux/slices/librarySlice";
import uiReducer, { setSelectedMenuItem, setSelectedCharacter } from "../src/renderer/src/redux/slices/uiSlice";
import presetsReducer from "../src/renderer/src/redux/slices/presetsSlice";
import { selectModTypeFilteredModCards } from "../src/renderer/src/redux/selectors/ModCardsSelector";
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

describe("selectModTypeFilteredModCards", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should return all mods when menuItem is "All"', () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" })));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "UI" })));
    expect(selectModTypeFilteredModCards(store.getState())).toHaveLength(2);
  });

  it("should filter by modType", () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "UI" })));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "Character", character: "Ellen" })));
    store.dispatch(setSelectedMenuItem("UI"));
    const result = selectModTypeFilteredModCards(store.getState());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("A");
  });

  it('should filter Character mods by selectedCharacter when not "All"', () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" })));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "Character", character: "Nicole" })));
    store.dispatch(setSelectedMenuItem("Character"));
    store.dispatch(setSelectedCharacter("Ellen"));
    const result = selectModTypeFilteredModCards(store.getState());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("A");
  });

  it('should return all Character mods when character filter is "All"', () => {
    store.dispatch(addModInfo(makeMod({ name: "A", modType: "Character", character: "Ellen" })));
    store.dispatch(addModInfo(makeMod({ name: "B", modType: "Character", character: "Nicole" })));
    store.dispatch(addModInfo(makeMod({ name: "C", modType: "UI" })));
    store.dispatch(setSelectedMenuItem("Character"));
    expect(selectModTypeFilteredModCards(store.getState())).toHaveLength(2);
  });
});
