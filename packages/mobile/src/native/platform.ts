/**
 * Platform detection — replaces @tauri-apps/plugin-os `platform()`.
 * Returns values compatible with @nuclearplayer/ui PlatformProvider.
 */
import { Device } from '@capacitor/device';

export type MobilePlatform = 'ios' | 'android';

let cachedPlatform: MobilePlatform | null = null;

export async function getPlatform(): Promise<MobilePlatform> {
  if (cachedPlatform) return cachedPlatform;
  const info = await Device.getInfo();
  cachedPlatform = info.platform === 'ios' ? 'ios' : 'android';
  return cachedPlatform;
}

/** Sync version — safe to call after initPlatform() has resolved. */
export function getPlatformSync(): MobilePlatform {
  return cachedPlatform ?? 'android';
}

export async function initPlatform(): Promise<void> {
  await getPlatform();
}
