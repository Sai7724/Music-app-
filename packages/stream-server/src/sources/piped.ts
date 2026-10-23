/**
 * Piped — YouTube proxy that bypasses bot detection.
 * Uses public Piped instances, no auth needed.
 * https://github.com/TeamPiped/Piped
 */

import type { SearchResult, StreamInfo } from './types.js';

// Public Piped instances — we try them in order
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://piped-api.garudalinux.org',
  'https://api.piped.yt',
];

async function pipedFetch<T>(path: string): Promise<T> {
  let lastError: Error | null = null;

  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { 'User-Agent': 'Nuclear/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      return await res.json() as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw lastError ?? new Error('All Piped instances failed');
}

export async function searchPiped(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  try {
    const data = await pipedFetch<{
      items?: Array<{
        url?: string;
        title?: string;
        duration?: number;
        thumbnail?: string;
        uploaderName?: string;
        type?: string;
      }>;
    }>(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);

    return (data.items ?? [])
      .filter((item) => item.type === 'stream' && item.url)
      .slice(0, limit)
      .map((item) => {
        const videoId = item.url?.replace('/watch?v=', '') ?? '';
        return {
          id: `youtube:${videoId}`,
          title: item.title ?? '',
          duration: item.duration ?? null,
          thumbnail: item.thumbnail ?? null,
          artist: item.uploaderName ?? null,
          provider: 'youtube' as const,
        };
      });
  } catch (e) {
    console.warn('[piped] search failed:', e);
    return [];
  }
}

export async function streamPiped(videoId: string): Promise<StreamInfo> {
  const data = await pipedFetch<{
    audioStreams?: Array<{
      url?: string;
      bitrate?: number;
      mimeType?: string;
    }>;
    duration?: number;
    title?: string;
  }>(`/streams/${videoId}`);

  // Pick highest bitrate audio stream
  const streams = (data.audioStreams ?? [])
    .filter((s) => s.url)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  const best = streams[0];
  if (!best?.url) throw new Error('No audio stream from Piped');

  return {
    stream_url: best.url,
    duration: data.duration ? data.duration * 1000 : null,
    title: data.title ?? null,
    provider: 'piped',
  };
}
