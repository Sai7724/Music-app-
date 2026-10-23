import type { SettingDefinition } from '@nuclearplayer/plugin-sdk';

/**
 * Core settings for mobile — same IDs as desktop so plugins stay compatible.
 * Uses `title` (not `label`) matching the SettingDefinition type.
 */
export function registerMobileCoreSettings(): SettingDefinition[] {
  return [
    {
      id: 'playback.volume',
      title: 'Volume',
      category: 'playback',
      kind: 'number',
      default: 1,
    },
    {
      id: 'playback.muted',
      title: 'Muted',
      category: 'playback',
      kind: 'boolean',
      default: false,
    },
    {
      id: 'playback.shuffle',
      title: 'Shuffle',
      category: 'playback',
      kind: 'boolean',
      default: false,
    },
    {
      id: 'playback.repeat',
      title: 'Repeat',
      category: 'playback',
      kind: 'string',
      default: 'off',
    },
    {
      id: 'playback.crossfadeMs',
      title: 'Crossfade (ms)',
      category: 'playback',
      kind: 'number',
      default: 0,
    },
    {
      id: 'history.enabled',
      title: 'Enable listening history',
      category: 'playback',
      kind: 'boolean',
      default: true,
    },
    {
      id: 'language',
      title: 'Language',
      category: 'general',
      kind: 'string',
      default: 'en',
    },
    // Theme settings — same IDs as desktop
    {
      id: 'theme.dark',
      title: 'Dark mode',
      category: 'appearance',
      kind: 'boolean',
      default: true,
    },
    {
      id: 'theme.id',
      title: 'Theme',
      category: 'appearance',
      kind: 'string',
      default: 'nuclear:default',
    },
  ];
}
