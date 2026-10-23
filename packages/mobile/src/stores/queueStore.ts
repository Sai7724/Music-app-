/**
 * Mobile queue store — identical logic to the desktop version,
 * but uses MobileStore instead of LazyStore from @tauri-apps/plugin-store.
 */
import { produce } from 'immer';
import partition from 'lodash-es/partition';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

import type { Queue, QueueItem, StreamCandidate, Track } from '@nuclearplayer/model';
import { stripResolutionState } from '@nuclearplayer/model';

import { MobileStore } from '../native/storage';
import { getSetting } from './settingsStore';

// We re-export eventBus and soundStore from the shared packages
// via re-export shims at the bottom of this file.
import { eventBus } from '../services/eventBus';
import { useSoundStore } from './soundStore';

const store = new MobileStore('queue');

type QueueStore = Queue & {
  isLoading: boolean;
  isReady: boolean;
  loadFromDisk: () => Promise<void>;
  addToQueue: (tracks: Track[]) => void;
  addNext: (tracks: Track[]) => void;
  addAt: (tracks: Track[], index: number) => void;
  removeByIds: (ids: string[]) => void;
  removeByIndices: (indices: number[]) => void;
  clearQueue: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  updateItemState: (id: string, updates: Partial<QueueItem>) => void;
  updateCandidate: (itemId: string, candidate: StreamCandidate) => void;
  removeCandidate: (itemId: string, candidateId: string) => void;
  selectCandidate: (itemId: string, candidateId: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  goToId: (id: string) => void;
  getCurrentItem: () => QueueItem | undefined;
  getItemById: (id: string) => QueueItem | undefined;
};

const createQueueItem = (track: Track): QueueItem => ({
  id: uuidv4(),
  track: stripResolutionState(track),
  status: 'idle',
  addedAtIso: new Date().toISOString(),
});

const getDirectionalIndex = (
  state: Pick<QueueStore, 'items' | 'currentIndex'>,
  direction: 'forward' | 'backward',
): number => {
  const { items, currentIndex } = state;
  const shuffleEnabled = (getSetting('core.playback.shuffle') as boolean) ?? false;
  const repeatMode = (getSetting('core.playback.repeat') as string) ?? 'off';

  if (items.length === 0) return currentIndex;
  if (shuffleEnabled) return getShuffledIndex(items.length, currentIndex);

  if (direction === 'forward') {
    if (currentIndex < items.length - 1) return currentIndex + 1;
    return repeatMode === 'all' ? 0 : currentIndex;
  }

  if (currentIndex > 0) return currentIndex - 1;
  return repeatMode === 'all' ? items.length - 1 : currentIndex;
};

const getShuffledIndex = (length: number, current: number): number => {
  if (length <= 1) return current;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
};

const emitSkip = () => {
  const { seek } = useSoundStore.getState();
  eventBus.emit('playbackSkipped', { positionMs: Math.round(seek * 1000) });
};

/** Stop playback AND clear the audio source so the old song is immediately silenced. */
const stopAndClearSrc = () => {
  const sound = useSoundStore.getState();
  sound.stop();
  sound.setSrc(null);
};

const saveToDisk = async () => {
  const state = useQueueStore.getState();
  await store.set('queue.items', state.items);
  await store.set('queue.currentIndex', state.currentIndex);
  await store.save();
};

const withPersistence =
  <T extends unknown[]>(fn: (...args: T) => void) =>
  (...args: T) => {
    fn(...args);
    void saveToDisk();
  };

export const useQueueStore = create<QueueStore>((set, get) => ({
  items: [],
  currentIndex: 0,
  isReady: false,
  isLoading: false,

  loadFromDisk: async () => {
    set({ isLoading: true });
    const items = (await store.get<QueueItem[]>('queue.items')) ?? [];
    const currentIndex = (await store.get<number>('queue.currentIndex')) ?? 0;
    const sanitizedIndex =
      currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0;
    const resetItems = items.map((item) => ({
      ...item,
      status: 'idle' as const,
      error: undefined,
    }));
    set({ items: resetItems, currentIndex: sanitizedIndex, isReady: true, isLoading: false });
  },

  addToQueue: withPersistence((tracks: Track[]) => {
    set(produce((state: QueueStore) => {
      state.items.push(...tracks.map(createQueueItem));
    }));
  }),

  addNext: (tracks) => {
    get().addAt(tracks, get().currentIndex + 1);
  },

  addAt: withPersistence((tracks: Track[], index: number) => {
    set(produce((state: QueueStore) => {
      const newItems = tracks.map(createQueueItem);
      state.items.splice(index, 0, ...newItems);
      if (index <= state.currentIndex) state.currentIndex += newItems.length;
    }));
  }),

  removeByIds: withPersistence((ids: string[]) => {
    const currentItem = get().getCurrentItem();
    const currentRemoved = currentItem && ids.includes(currentItem.id);
    set(produce((state: QueueStore) => {
      const set_ = new Set(ids);
      const removedBefore = state.items.slice(0, state.currentIndex).filter((i) => set_.has(i.id)).length;
      state.items = state.items.filter((i) => !set_.has(i.id));
      state.currentIndex = Math.max(0, state.currentIndex - removedBefore);
      if (state.currentIndex >= state.items.length)
        state.currentIndex = Math.max(0, state.items.length - 1);
    }));
    if (currentRemoved || get().items.length === 0) useSoundStore.getState().stop();
  }),

  removeByIndices: withPersistence((indices: number[]) => {
    const currentRemoved = indices.includes(get().currentIndex);
    set(produce((state: QueueStore) => {
      const set_ = new Set(indices);
      const removedBefore = indices.filter((i) => i < state.currentIndex).length;
      state.items = state.items.filter((_, i) => !set_.has(i));
      state.currentIndex = Math.max(0, state.currentIndex - removedBefore);
      if (state.currentIndex >= state.items.length)
        state.currentIndex = Math.max(0, state.items.length - 1);
    }));
    if (currentRemoved || get().items.length === 0) useSoundStore.getState().stop();
  }),

  clearQueue: withPersistence(() => {
    set({ items: [], currentIndex: 0 });
    useSoundStore.getState().stop();
  }),

  reorder: withPersistence((from: number, to: number) => {
    set(produce((state: QueueStore) => {
      const [moved] = state.items.splice(from, 1);
      state.items.splice(to, 0, moved);
      if (state.currentIndex === from) state.currentIndex = to;
      else if (from < state.currentIndex && to >= state.currentIndex) state.currentIndex -= 1;
      else if (from > state.currentIndex && to <= state.currentIndex) state.currentIndex += 1;
    }));
  }),

  updateItemState: withPersistence((id: string, updates: Partial<QueueItem>) => {
    set(produce((state: QueueStore) => {
      const item = state.items.find((i) => i.id === id);
      if (item) Object.assign(item, updates);
    }));
  }),

  updateCandidate: (itemId, candidate) => {
    const item = get().getItemById(itemId);
    if (!item) return;
    get().updateItemState(itemId, {
      track: {
        ...item.track,
        streamCandidates: item.track.streamCandidates?.map((c) =>
          c.id === candidate.id ? candidate : c,
        ),
      },
    });
  },

  removeCandidate: (itemId, candidateId) => {
    const item = get().getItemById(itemId);
    if (!item) return;
    get().updateItemState(itemId, {
      track: {
        ...item.track,
        streamCandidates: item.track.streamCandidates?.filter((c) => c.id !== candidateId),
      },
    });
  },

  selectCandidate: (itemId, candidateId) => {
    const item = get().getItemById(itemId);
    if (!item) return;
    const [selected, rest] = partition(
      item.track.streamCandidates ?? [],
      (c) => c.id === candidateId,
    );
    get().updateItemState(itemId, {
      track: {
        ...item.track,
        streamCandidates: [
          ...selected.map((c) => ({ ...c, failed: false })),
          ...rest,
        ],
      },
    });
  },

  goToNext: withPersistence(() => {
    const state = get();
    const next = getDirectionalIndex(state, 'forward');
    if (next !== state.currentIndex) {
      emitSkip();
      stopAndClearSrc();
      set({ currentIndex: next });
    }
  }),

  goToPrevious: withPersistence(() => {
    const state = get();
    const prev = getDirectionalIndex(state, 'backward');
    if (prev !== state.currentIndex) {
      emitSkip();
      stopAndClearSrc();
      set({ currentIndex: prev });
    }
  }),

  goToIndex: withPersistence((index: number) => {
    const { items, currentIndex } = get();
    if (index >= 0 && index < items.length && index !== currentIndex) {
      emitSkip();
      stopAndClearSrc();
      set({ currentIndex: index });
    }
  }),

  goToId: withPersistence((id: string) => {
    const { items, currentIndex } = get();
    const index = items.findIndex((i) => i.id === id);
    if (index !== -1 && index !== currentIndex) {
      emitSkip();
      stopAndClearSrc();
      set({ currentIndex: index });
    }
  }),

  getCurrentItem: () => {
    const { items, currentIndex } = get();
    return items[currentIndex];
  },

  getItemById: (id) => get().items.find((i) => i.id === id),
}));

export const initializeQueueStore = async (): Promise<void> => {
  await useQueueStore.getState().loadFromDisk();
};
