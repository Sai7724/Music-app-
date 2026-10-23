/**
 * Invidious/Piped — YouTube proxy that bypasses bot detection.
 * Uses multiple public instances with automatic failover.
 */

import type { SearchResult, StreamInfo } from './types.js';

// Public Invidious instances (more reliable than Piped currently)
const INVIDIOUS_INSTANCES = [
  'https://iv.datura.network',
  'https://invidious.privacyredirect.com',
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.io.lol',
  'https://invidious.perennialte.ch',
];

async function invidiousFetch<T>(path: string): Promise<T> {
  let lastError: Error | null = null;

  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { 'User-Agent': 'Nuclear/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        lastError = new Error(`${base} returned ${res.status}`);
        continue;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw lastError ?? new Error('All Invidious instances failed');
}

type InvidiousSearchResult = {
  type?: string;
  videoId?: string;
  title?: string;
  lengthSeconds?: number;
  videoThumbnails?: Array<{ quality?: string; url?: string }>;
  author?: string;
};

type InvidiousVideoInfo = {
  adaptiveFormats?: Array<{
    type?: string;
    url?: string;
    bitrate?: number;
    audioSampleRate?: number;
    itag?: number;
  }>;
  formatStreams?: Array<{
    url?: string;
    itag?: number;
  }>;
  lengthSeconds?: number;
  title?: string;
};

export async function searchPiped(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  try {
    const data = await invidiousFetch<InvidiousSearchResult[]>(
      `/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,lengthSeconds,videoThumbnails,author,type`,
    );

    return data
      .filter((item) => item.type === 'video' && item.videoId)
      .slice(0, limit)
      .map((item) => ({
        id: `youtube:${item.videoId}`,
        title: item.title ?? '',
        duration: item.lengthSeconds ?? null,
        thumbnail:
          item.videoThumbnails?.find((t) => t.quality === 'medium')?.url ??
          item.videoThumbnails?.[0]?.url ??
          null,
        artist: item.author ?? null,
        provider: 'youtube' as const,
      }));
  } catch (e) {
    console.warn('[invidious] search failed:', e);
    return [];
  }
}

export async function streamPiped(videoId: string): Promise<StreamInfo> {
  const data = await invidiousFetch<InvidiousVideoInfo>(
    `/api/v1/videos/${videoId}?fields=adaptiveFormats,formatStreams,lengthSeconds,title`,
  );

  // Pick best audio-only stream
  const audioStreams = (data.adaptiveFormats ?? [])
    .filter(
      (f) => f.type?.startsWith('audio/') && f.url && !f.type.includes('video'),
    )
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  const best = audioStreams[0] ?? data.formatStreams?.[0];

  if (!best?.url) {
    throw new Error('Invidious: no audio stream found');
  }

  return {
    stream_url: best.url,
    duration: data.lengthSeconds ? data.lengthSeconds * 1000 : null,
    title: data.title ?? null,
    provider: 'invidious',
  };
}
