import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface Preset {
  name: string;
  mods: string[];
}

export interface PresetsState {
  presets: Preset[];
  currentPresetName: string;
}

const DEFAULT_PRESET_NAME = "Default Preset";

const initialState: PresetsState = {
  presets: [{ name: DEFAULT_PRESET_NAME, mods: [] }],
  currentPresetName: DEFAULT_PRESET_NAME,
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
      if (state.presets.some((preset) => preset.name === newPresetName)) {
        return;
      }
      state.presets.push({ name: newPresetName, mods: [] });
    },
    removePreset: (state, action: PayloadAction<string>) => {
      const targetPresetName = action.payload;
      if (targetPresetName === DEFAULT_PRESET_NAME) {
        return;
      }
      const index = state.presets.findIndex((preset) => preset.name === targetPresetName);
      if (index === -1) {
        return;
      }
      if (state.currentPresetName === targetPresetName) {
        const newIndex = Math.max(0, index - 1);
        state.currentPresetName = state.presets[newIndex].name;
      }
      state.presets.splice(index, 1);
    },
    setCurrentPreset: (state, action: PayloadAction<string>) => {
      const targetPresetName = action.payload;
      if (state.presets.some((preset) => preset.name === targetPresetName)) {
        state.currentPresetName = targetPresetName;
      }
    },
    applyMods: (state, action: PayloadAction<{ modName: string; enabled: boolean }[]>) => {
      const currentPreset = state.presets.find((preset) => preset.name === state.currentPresetName);
      if (!currentPreset) {
        return;
      }
      const modsStatus = action.payload;
      for (const { modName, enabled } of modsStatus) {
        const exists = currentPreset.mods.includes(modName);
        console.log(`Mod: ${modName}, Enabled: ${enabled}, Exists in Preset: ${exists}`);
        if (enabled && !exists) {
          currentPreset.mods.push(modName);
        }
        if (!enabled && exists) {
          currentPreset.mods = currentPreset.mods.filter((name) => name !== modName);
        }
      }
    },
  },
});

export const { addPreset, removePreset, setCurrentPreset, applyMods } = presetsSlice.actions;
export default persistReducer(presetsPresistConfig, presetsSlice.reducer);

export const selectAllPresetNames = (state: { presets: PresetsState }) =>
  state.presets.presets.map((preset) => preset.name);
export const selectCurrentPresetName = (state: { presets: PresetsState }) => state.presets.currentPresetName;
export const selectModNamesInCurrentPreset = (state: { presets: PresetsState }) => {
  const currentPreset = state.presets.presets.find((preset) => preset.name === state.presets.currentPresetName);
  return currentPreset ? currentPreset.mods : [];
};
export const selectModIsEnabled = (modName: string) => (state: { presets: PresetsState }) => {
  const currentPreset = state.presets.presets.find((preset) => preset.name === state.presets.currentPresetName);
  return currentPreset ? currentPreset.mods.includes(modName) : false;
};
