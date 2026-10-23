/**
 * Storage abstraction — replaces @tauri-apps/plugin-store (LazyStore).
 * Uses @capacitor/preferences which works on both iOS and Android.
 *
 * API is intentionally identical to how LazyStore is used in the player
 * stores so the mobile stores are drop-in replacements.
 */
import { Preferences } from '@capacitor/preferences';

export class MobileStore {
  private cache: Record<string, unknown> = {};
  private loaded = false;

  constructor(private readonly namespace: string) {}

  private key(k: string): string {
    return `${this.namespace}:${k}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key: this.key(key) });
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    this.cache[key] = value;
  }

  /** Flush all pending sets to Capacitor Preferences. */
  async save(): Promise<void> {
    await Promise.all(
      Object.entries(this.cache).map(([key, value]) =>
        Preferences.set({
          key: this.key(key),
          value: JSON.stringify(value),
        }),
      ),
    );
    this.cache = {};
  }

  async entries(): Promise<[string, unknown][]> {
    if (this.loaded) {
      // Already loaded — return from a full scan of preferences with this namespace
    }
    const { keys } = await Preferences.keys();
    const prefix = `${this.namespace}:`;
    const relevant = keys.filter((k) => k.startsWith(prefix));

    const pairs = await Promise.all(
      relevant.map(async (k) => {
        const { value } = await Preferences.get({ key: k });
        const shortKey = k.slice(prefix.length);
        try {
          return [shortKey, value !== null ? JSON.parse(value) : null] as [string, unknown];
        } catch {
          return [shortKey, null] as [string, unknown];
        }
      }),
    );

    this.loaded = true;
    return pairs;
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key: this.key(key) });
  }

  async clear(): Promise<void> {
    const { keys } = await Preferences.keys();
    const prefix = `${this.namespace}:`;
    await Promise.all(
      keys
        .filter((k) => k.startsWith(prefix))
        .map((k) => Preferences.remove({ key: k })),
    );
  }
}
