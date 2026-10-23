/**
 * Mobile settings store.
 * Replaces the Tauri LazyStore-backed settingsStore with MobileStore
 * backed by @capacitor/preferences. API is identical.
 */
import { create } from 'zustand';

import type {
  SettingDefinition,
  SettingSource,
  SettingValue,
} from '@nuclearplayer/plugin-sdk';

import { MobileStore } from '../native/storage';

const store = new MobileStore('settings');

type Registry = Record<string, SettingDefinition>;
type Values = Record<string, SettingValue>;

type State = {
  definitions: Registry;
  values: Values;
  loaded: boolean;
  loadFromDisk: () => Promise<void>;
  register: (definitions: SettingDefinition[], source: SettingSource) => string[];
  getValue: (fullyQualifiedId: string) => SettingValue;
  setValue: (fullyQualifiedId: string, value: SettingValue) => Promise<void>;
};

export const useSettingsStore = create<State>((set, get) => ({
  definitions: {},
  values: {},
  loaded: false,

  loadFromDisk: async () => {
    const entries = await store.entries();
    const loadedValues: Values = {};
    for (const [key, value] of entries) {
      loadedValues[key] = value as SettingValue;
    }
    set({ values: loadedValues, loaded: true });
  },

  register: (definitions, source) => {
    const ids: string[] = [];
    const map: Registry = { ...get().definitions };
    for (const def of definitions) {
      const fqid = normalizeId(source, def.id);
      map[fqid] = { ...def, source };
      ids.push(fqid);
    }
    set({ definitions: map });
    return ids;
  },

  getValue: (fullyQualifiedId) => {
    const { values, definitions } = get();
    return values[fullyQualifiedId] ?? definitions[fullyQualifiedId]?.default;
  },

  setValue: async (fullyQualifiedId, value) => {
    set({ values: { ...get().values, [fullyQualifiedId]: value } });
    await store.set(fullyQualifiedId, value as unknown);
    await store.save();
  },
}));

const normalizeId = (source: SettingSource, id: string): string => {
  if (source.type === 'plugin') return `plugin.${source.pluginId}.${id}`;
  return `core.${id}`;
};

export const initializeSettingsStore = async (): Promise<void> => {
  await useSettingsStore.getState().loadFromDisk();
};

export const registerCoreSettings = (definitions: SettingDefinition[]): string[] =>
  useSettingsStore.getState().register(definitions, { type: 'core' });

export const getSetting = (fullyQualifiedId: string): SettingValue =>
  useSettingsStore.getState().getValue(fullyQualifiedId);

export const setSetting = async (
  fullyQualifiedId: string,
  value: SettingValue,
): Promise<void> => useSettingsStore.getState().setValue(fullyQualifiedId, value);
