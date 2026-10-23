/**
 * Sound store — pure Zustand, no native deps. Copied from desktop.
 * Shared between iOS and Android.
 */
import { create } from 'zustand';

import { AudioSource, SoundStatus } from '@nuclearplayer/hifi';

import { eventBus } from '../services/eventBus';

type SoundState = {
  src: AudioSource | null;
  status: SoundStatus;
  seek: number;
  duration: number;
  crossfadeMs: number;
};

type SoundActions = {
  setSrc: (src: AudioSource | null) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  updatePlayback: (position: number, duration: number) => void;
  setCrossfadeMs: (ms: number) => void;
};

export const useSoundStore = create<SoundState & SoundActions>((set, get) => ({
  src: null,
  status: 'stopped',
  seek: 0,
  duration: 0,
  crossfadeMs: 0,

  setSrc: (src) => set({ src, seek: 0, duration: 0 }),
  play: () => set({ status: 'playing' }),
  pause: () => set({ status: 'paused' }),
  stop: () => set({ status: 'stopped', seek: 0 }),

  toggle: () => {
    const { status } = get();
    if (status === 'playing') get().pause();
    else get().play();
  },

  seekTo: (seconds) => {
    eventBus.emit('playbackSeeked', {
      fromMs: Math.round(get().seek * 1000),
      toMs: Math.round(seconds * 1000),
    });
    set({ seek: seconds });
  },

  updatePlayback: (position, duration) => set({ seek: position, duration }),
  setCrossfadeMs: (ms) => set({ crossfadeMs: ms }),
}));
