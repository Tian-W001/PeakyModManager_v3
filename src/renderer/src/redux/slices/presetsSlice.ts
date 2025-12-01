import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { RootState } from "../store";

export type Presets = Record<string, string[]>; //<presetName, modNames[]>
export type DiffList = Record<string, boolean>; //<modName, enable>

export interface PresetsState {
  presets: Presets;
  currentPresetName: string;
  diffList: Record<string, boolean>;
}

const DEFAULT_PRESET_NAME = "Default Preset";

const initialState: PresetsState = {
  presets: { [DEFAULT_PRESET_NAME]: [] },
  currentPresetName: DEFAULT_PRESET_NAME,
  diffList: {},
};

const presetsPresistConfig = {
  key: "presets",
  storage,
  whitelist: ["presets", "currentPresetName"],
};

export const presetsSlice = createSlice({
  name: "presets",
  initialState,
  reducers: {
    addPreset: (state, action: PayloadAction<string>) => {
      const newPresetName = action.payload;
      if (state.presets[newPresetName]) {
        return;
      }
      state.presets[newPresetName] = [];
    },
    removePreset: (state, action: PayloadAction<string>) => {
      const targetPresetName = action.payload;
      if (targetPresetName === DEFAULT_PRESET_NAME) {
        return;
      }
      if (!state.presets[targetPresetName]) {
        return;
      }
      delete state.presets[targetPresetName];

      if (state.currentPresetName === targetPresetName) {
        state.currentPresetName = DEFAULT_PRESET_NAME;
      }
    },
    setPresets: (state, action: PayloadAction<Presets>) => {
      const backupData = action.payload;
      if (!backupData) return;

      state.presets = backupData;
      if (!state.presets[DEFAULT_PRESET_NAME]) {
        state.presets[DEFAULT_PRESET_NAME] = [];
      }
      if (!state.presets[state.currentPresetName]) {
        state.currentPresetName = DEFAULT_PRESET_NAME;
      }
    },
    setCurrentPreset: (state, action: PayloadAction<string>) => {
      // temporarily move currentPreset infos to diffList
      const targetPresetName = action.payload;
      if (state.presets[targetPresetName]) {
        state.currentPresetName = targetPresetName;
        state.diffList = state.presets[targetPresetName].reduce<DiffList>((acc, modName) => {
          acc[modName] = true;
          return acc;
        }, {});
        state.presets[state.currentPresetName] = [];
      }
    },
    applyMods: (state, action: PayloadAction<DiffList>) => {
      console.log("Applying mods to preset:", action.payload);
      const currentPreset = state.presets[state.currentPresetName];
      if (!currentPreset) {
        return;
      }
      const diffList = action.payload;
      for (const [modName, enable] of Object.entries(diffList)) {
        const index = currentPreset.indexOf(modName);
        if (enable && index === -1) {
          currentPreset.push(modName);
        } else if (!enable && index !== -1) {
          currentPreset.splice(index, 1);
        }
      }
    },
    renamePreset: (state, action: PayloadAction<{ oldName: string; newName: string }>) => {
      const { oldName, newName } = action.payload;
      if (oldName === DEFAULT_PRESET_NAME || newName === DEFAULT_PRESET_NAME) {
        return;
      }
      if (state.presets[newName]) {
        return;
      }
      const mods = state.presets[oldName];
      if (mods) {
        state.presets[newName] = mods;
        delete state.presets[oldName];
        if (state.currentPresetName === oldName) {
          state.currentPresetName = newName;
        }
      }
    },
    addToDiffList: (state, action: PayloadAction<DiffList>) => {
      const newDiffList = action.payload;
      for (const [modName, enable] of Object.entries(newDiffList)) {
        if (state.diffList[modName] === undefined) {
          state.diffList[modName] = enable;
        } else if (state.diffList[modName] !== enable) {
          delete state.diffList[modName];
        }
      }
    },
    clearDiffList: (state) => {
      state.diffList = {};
    },
  },
});

export const {
  addPreset,
  removePreset,
  setPresets,
  setCurrentPreset,
  applyMods,
  renamePreset,
  addToDiffList,
  clearDiffList,
} = presetsSlice.actions;
export default persistReducer(presetsPresistConfig, presetsSlice.reducer);

export const selectAllPresets = (state: RootState) => state.presets.presets;

export const selectAllPresetNames = createSelector(
  (state: RootState) => state.presets.presets,
  (presets) => Object.keys(presets)
);

export const selectCurrentPresetName = (state: RootState) => state.presets.currentPresetName;

export const selectCurrentPresetMods = (state: RootState) =>
  state.presets.presets[state.presets.currentPresetName] || [];

export const selectModIsEnabled = (modName: string) => (state: RootState) => {
  const currentPresetMods = state.presets.presets[state.presets.currentPresetName];
  return currentPresetMods ? currentPresetMods.includes(modName) : false;
};

export const selectDiffList = (state: RootState) => state.presets.diffList;

export const selectModDiffState = (modName: string) => (state: RootState) => {
  return state.presets.diffList[modName] !== undefined ? state.presets.diffList[modName] : null;
};
