import React from 'react';

import { setBasicTheme } from '@nuclearplayer/themes';

import { initPlatform } from './native/platform';
import { initHistoryService } from './services/historyService';
import { registerMobileCoreSettings } from './services/coreSettings';
import { initializeFavoritesStore } from './stores/favoritesStore';
import { initializeQueueStore } from './stores/queueStore';
import { initializeSettingsStore, registerCoreSettings, useSettingsStore } from './stores/settingsStore';
import { MobileApp } from './MobileApp';

/**
 * Apply the saved theme (dark/light + colour palette) to <html> on startup.
 * Uses the same data-theme / data-theme-id attributes as the desktop app.
 */
const applyStoredTheme = (): void => {
  const getValue = useSettingsStore.getState().getValue;

  const isDark = getValue('core.theme.dark') as boolean | undefined;
  const themeId = getValue('core.theme.id') as string | undefined;

  // Apply dark/light mode
  if (isDark === true || isDark === undefined) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Apply colour theme palette
  if (themeId) {
    setBasicTheme(themeId);
  }
};

export const initMobileApp = async (
  root: ReturnType<typeof import('react-dom/client').createRoot>,
): Promise<void> => {
  // 1. Platform detection (iOS vs Android)
  await initPlatform();

  // 2. Stores — same order as desktop
  await initializeSettingsStore();
  await initializeQueueStore();
  await initializeFavoritesStore();

  // 3. Register built-in settings (includes theme.dark + theme.id)
  registerCoreSettings(registerMobileCoreSettings());

  // 4. Re-apply persisted theme before first render — no flash
  applyStoredTheme();

  // 5. History service
  initHistoryService();

  // 6. Render
  root.render(
    <React.StrictMode>
      <MobileApp />
    </React.StrictMode>,
  );
};
