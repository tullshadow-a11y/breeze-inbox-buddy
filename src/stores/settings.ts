import { createPersistentStore, useStore } from "@/lib/persistent-store";
import { DEFAULT_SETTINGS, reviveSettings, SETTINGS_KEY, type Settings } from "@/lib/settings";

export const settingsStore = createPersistentStore<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS, reviveSettings);

export const useSettings = () => useStore(settingsStore);

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
}
