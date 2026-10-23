/**
 * Stream resolver for mobile.
 * Watches the queue and resolves streams via the Render backend.
 */
import { useEffect, useRef } from 'react';

import type { QueueItem, StreamCandidate } from '@nuclearplayer/model';

import { ytdlpGetStream } from '../native/streamApi';
import { mobileAudioSourceFactory } from '../services/audioSourceFactory';
import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';

const buildKey = (item: QueueItem): string => {
  const head = item.track.streamCandidates?.[0];
  return [item.id, head?.id, head?.failed].join(':');
};

/**
 * Infer container and codec from the stream URL when the server doesn't
 * provide them explicitly. Common for Invidious/Piped sources which return
 * raw YouTube CDN URLs containing mime type and itag hints.
 */
function inferStreamMeta(
  url: string,
  serverContainer?: string | null,
  serverCodec?: string | null,
): {
  container: string | undefined;
  codec: string | undefined;
  mimeType: string | undefined;
} {
  // If server already told us, trust it
  if (serverContainer && serverCodec) {
    return {
      container: serverContainer,
      codec: serverCodec,
      mimeType: undefined,
    };
  }

  // Try to detect from URL params (YouTube CDN URLs contain mime= and itag= params)
  try {
    const urlObj = new URL(url);

    // YouTube CDN URLs often have mime=audio%2Fwebm or mime=audio%2Fmp4
    const mime = urlObj.searchParams.get('mime');
    if (mime) {
      if (mime.includes('audio/webm')) {
        return {
          container: 'webm',
          codec: serverCodec ?? 'opus',
          mimeType: mime,
        };
      }
      if (mime.includes('audio/mp4')) {
        return {
          container: 'm4a',
          codec: serverCodec ?? 'aac',
          mimeType: mime,
        };
      }
    }

    // Invidious itag-based detection
    const itag = urlObj.searchParams.get('itag');
    if (itag) {
      const itagNum = parseInt(itag, 10);
      // Common YouTube audio itags:
      // 249, 250, 251 = webm opus
      // 139, 140, 141 = m4a aac
      if ([249, 250, 251].includes(itagNum)) {
        return { container: 'webm', codec: 'opus', mimeType: 'audio/webm' };
      }
      if ([139, 140, 141].includes(itagNum)) {
        return { container: 'm4a', codec: 'aac', mimeType: 'audio/mp4' };
      }
    }
  } catch {
    // URL parsing failed — not a problem, we'll use plain http
  }

  // Check file extension in the path
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.webm') || lowerUrl.includes('audio%2fwebm')) {
    return {
      container: 'webm',
      codec: serverCodec ?? 'opus',
      mimeType: 'audio/webm',
    };
  }
  if (lowerUrl.includes('.m4a') || lowerUrl.includes('audio%2fmp4')) {
    return {
      container: 'm4a',
      codec: serverCodec ?? 'aac',
      mimeType: 'audio/mp4',
    };
  }
  if (lowerUrl.includes('.mp3')) {
    return { container: 'mp3', codec: 'mp3', mimeType: 'audio/mpeg' };
  }
  if (lowerUrl.includes('.ogg')) {
    return { container: 'ogg', codec: 'vorbis', mimeType: 'audio/ogg' };
  }

  return {
    container: serverContainer ?? undefined,
    codec: serverCodec ?? undefined,
    mimeType: undefined,
  };
}

const resolveStream = async (item: QueueItem): Promise<void> => {
  const { updateItemState } = useQueueStore.getState();
  updateItemState(item.id, { status: 'loading', error: undefined });

  try {
    // Get stream info from Render backend — passes composite id + title
    // Server tries all sources automatically (Piped → yt-dlp)
    console.log(
      '[MobileStreamResolver] Resolving stream for:',
      item.track.source.id,
      item.track.title,
    );
    const info = await ytdlpGetStream(
      null,
      item.track.source.id,
      item.track.title,
    );
    console.log('[MobileStreamResolver] Stream info received:', info);

    if (!info.stream_url) {
      throw new Error('Backend returned empty stream_url');
    }

    // Guard: if the current item changed while we were fetching, discard this result
    const current = useQueueStore.getState().getCurrentItem();
    if (!current || current.id !== item.id) {
      return;
    }

    // Infer container/codec from URL when server doesn't provide them
    // (common for Invidious/Piped streams)
    const meta = inferStreamMeta(info.stream_url, info.container, info.codec);
    console.log('[MobileStreamResolver] Inferred stream meta:', meta);

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
        protocol: (meta.container === 'm3u8' ? 'hls' : 'http') as
          'hls' | 'http',
        durationMs: info.duration ?? undefined,
        codec: meta.codec,
        container: meta.container,
        mimeType: meta.mimeType,
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
    console.log('[MobileStreamResolver] Audio source created:', audioSource);
    // Set the source — MobileSoundProvider's onCanPlay will trigger play() once buffered
    useSoundStore.getState().setSrc(audioSource);
  } catch (error) {
    console.error('[MobileStreamResolver] Failed to resolve stream:', error);
    updateItemState(item.id, {
      status: 'error',
      error: 'streaming:errors.streamResolutionFailed',
    });
    // Auto-advance to next track on failure after a short delay
    setTimeout(() => {
      const current = useQueueStore.getState().getCurrentItem();
      if (current?.id === item.id && current.status === 'error') {
        console.log(
          '[MobileStreamResolver] Auto-advancing to next track after failure',
        );
        useQueueStore.getState().goToNext();
      }
    }, 2000);
  }
};

export const MobileStreamResolver = () => {
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    const onCurrentItemChanged = (currentItem: QueueItem | undefined) => {
      if (!currentItem) {
        return;
      }

      const key = buildKey(currentItem);
      if (key === keyRef.current) {
        return;
      }
      keyRef.current = key;

      if (currentItem.status === 'loading') {
        return;
      }

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
