/**
 * Mobile listening history service.
 * Stores history locally using MobileStore (Capacitor Preferences).
 * The Tauri SQLite backend is not available on mobile, so we use a
 * lightweight JSON-based history stored in Preferences.
 */
import type { Track } from '@nuclearplayer/model';
import { pickArtwork } from '@nuclearplayer/model';

import { MobileStore } from '../native/storage';
import { eventBus } from './eventBus';
import { getSetting } from '../stores/settingsStore';
import { useSoundStore } from '../stores/soundStore';

const store = new MobileStore('history');
const HISTORY_KEY = 'history.entries';
const MAX_HISTORY_ENTRIES = 500;
const HISTORY_ENABLED_SETTING = 'core.history.enabled';

export type HistoryEntry = {
  playId: string;
  title: string;
  artists: string[];
  albumTitle: string | null;
  durationMs: number | null;
  artworkUrl: string | null;
  provider: string | null;
  providerId: string | null;
  startedAt: number;
  msPlayed: number;
};

let currentPlayId: string | null = null;
let playStartedAt: number | null = null;

const isEnabled = () => getSetting(HISTORY_ENABLED_SETTING) !== false;

const buildEntry = (track: Track): Omit<HistoryEntry, 'msPlayed'> => ({
  playId: crypto.randomUUID(),
  title: track.title,
  artists: track.artists.map((a) => a.name),
  albumTitle: track.album?.title ?? null,
  durationMs: track.durationMs ?? null,
  artworkUrl:
    pickArtwork(track.artwork, 'thumbnail', 256)?.url ?? null,
  provider: track.source.provider,
  providerId: track.source.id,
  startedAt: Date.now(),
});

async function appendEntry(entry: HistoryEntry): Promise<void> {
  const existing = (await store.get<HistoryEntry[]>(HISTORY_KEY)) ?? [];
  const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  await store.set(HISTORY_KEY, updated);
  await store.save();
}

export async function getHistory(
  limit = 50,
  offset = 0,
): Promise<{ items: HistoryEntry[]; total: number }> {
  const all = (await store.get<HistoryEntry[]>(HISTORY_KEY)) ?? [];
  return {
    items: all.slice(offset, offset + limit),
    total: all.length,
  };
}

export async function clearHistory(): Promise<void> {
  await store.set(HISTORY_KEY, []);
  await store.save();
}

export function initHistoryService(): () => void {
  const unsubscribes = [
    eventBus.on('trackStarted', (track) => {
      if (!isEnabled()) return;
      const entry = buildEntry(track);
      currentPlayId = entry.playId;
      playStartedAt = Date.now();
      void appendEntry({ ...entry, msPlayed: 0 });
    }),

    eventBus.on('trackFinished', () => {
      if (!isEnabled() || !currentPlayId || !playStartedAt) return;
      const msPlayed = Date.now() - playStartedAt;
      void updateLastEntry(currentPlayId, msPlayed);
      currentPlayId = null;
      playStartedAt = null;
    }),

    eventBus.on('playbackSkipped', ({ positionMs }) => {
      if (!isEnabled() || !currentPlayId) return;
      void updateLastEntry(currentPlayId, positionMs);
      currentPlayId = null;
      playStartedAt = null;
    }),

    eventBus.on('playbackStopped', ({ positionMs }) => {
      if (!isEnabled() || !currentPlayId) return;
      void updateLastEntry(currentPlayId, positionMs);
      currentPlayId = null;
      playStartedAt = null;
    }),
  ];

  return () => unsubscribes.forEach((unsub) => unsub());
}

async function updateLastEntry(playId: string, msPlayed: number): Promise<void> {
  const all = (await store.get<HistoryEntry[]>(HISTORY_KEY)) ?? [];
  const idx = all.findIndex((e) => e.playId === playId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], msPlayed };
    await store.set(HISTORY_KEY, all);
    await store.save();
  }
}
