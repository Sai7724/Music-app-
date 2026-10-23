/**
 * React hook to read and update a core setting.
 * Same API as the desktop version.
 */
import { useCallback } from 'react';

import type { SettingValue } from '@nuclearplayer/plugin-sdk';

import { useSettingsStore } from '../stores/settingsStore';

export function useCoreSetting<T extends SettingValue>(
  id: string,
): [T | undefined, (value: T) => Promise<void>] {
  const fqid = id.startsWith('core.') ? id : `core.${id}`;

  const value = useSettingsStore((s) => s.getValue(fqid)) as T | undefined;

  const setValue = useCallback(
    async (newValue: T) => {
      await useSettingsStore.getState().setValue(fqid, newValue);
    },
    [fqid],
  );

  return [value, setValue];
}
