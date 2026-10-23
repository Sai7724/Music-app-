/**
 * Stream resolver for mobile.
 * Watches the queue and resolves streams via the Render backend.
 */
import { useEffect, useRef } from 'react';

import type { QueueItem, StreamCandidate } from '@nuclearplayer/model';

import { mobileAudioSourceFactory } from '../services/audioSourceFactory';
import { ytdlpGetStream } from '../native/streamApi';
import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';

const buildKey = (item: QueueItem): string => {
  const head = item.track.streamCandidates?.[0];
  return [item.id, head?.id, head?.failed].join(':');
};

const resolveStream = async (item: QueueItem): Promise<void> => {
  const { updateItemState } = useQueueStore.getState();
  updateItemState(item.id, { status: 'loading', error: undefined });

  try {
    // Get stream info from Render backend
    const info = await ytdlpGetStream(null, item.track.source.id);

    // Guard: if the current item changed while we were fetching, discard this result
    const current = useQueueStore.getState().getCurrentItem();
    if (!current || current.id !== item.id) return;

    const candidate: StreamCandidate = {
      id: item.track.source.id,
      title: item.track.title,
      failed: false,
      source: {
        provider: item.track.source.provider,
        id: item.track.source.id,
      },
      stream: {
        url: info.stream_url,
        protocol: (info.container === 'm3u8' ? 'hls' : 'http') as 'hls' | 'http',
        durationMs: info.duration ?? undefined,
        codec: info.codec ?? undefined,
        container: info.container ?? undefined,
        source: {
          provider: item.track.source.provider,
          id: item.track.source.id,
        },
      },
      durationMs: info.duration ?? undefined,
    };

    updateItemState(item.id, {
      status: 'success',
      track: { ...item.track, streamCandidates: [candidate] },
    });

    const audioSource = mobileAudioSourceFactory.fromCandidate(candidate);
    // Set the source — MobileSoundProvider's onCanPlay will trigger play() once buffered
    useSoundStore.getState().setSrc(audioSource);
  } catch (error) {
    console.error('[MobileStreamResolver] Failed to resolve stream:', error);
    updateItemState(item.id, {
      status: 'error',
      error: 'streaming:errors.streamResolutionFailed',
    });
  }
};

export const MobileStreamResolver = () => {
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    const onCurrentItemChanged = (currentItem: QueueItem | undefined) => {
      if (!currentItem) return;

      const key = buildKey(currentItem);
      if (key === keyRef.current) return;
      keyRef.current = key;

      if (currentItem.status === 'loading') return;

      void resolveStream(currentItem);
    };

    const unsubscribe = useQueueStore.subscribe((state) => {
      onCurrentItemChanged(state.getCurrentItem());
    });

    onCurrentItemChanged(useQueueStore.getState().getCurrentItem());
    return unsubscribe;
  }, []);

  return null;
};
