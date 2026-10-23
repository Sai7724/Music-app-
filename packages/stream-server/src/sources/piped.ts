/**
 * Invidious — YouTube proxy that bypasses bot detection.
 * Races all instances in parallel and uses the first one that responds.
 * Falls back to yt-dlp if all instances fail.
 */

import type { SearchResult, StreamInfo } from './types.js';

// Instances verified reachable from cloud (Render/US) as of 2026.
// Check https://api.invidious.io/ for updated lists.
const INVIDIOUS_INSTANCES = [
  'https://invidious.reallyaweso.me',
  'https://invidious.fdn.fr',
  'https://yt.cdaut.de',
  'https://invidious.protokolla.fi',
  'https://inv.nadeko.net',
  'https://invidious.perennialte.ch',
  'https://invidious.io.lol',
];

// Timeout per individual instance fetch (ms)
const INSTANCE_TIMEOUT_MS = 3000;

/**
 * Race all instances — return the first successful response.
 * Much faster than sequential: one working instance wins immediately
 * instead of waiting for each dead one to time out.
 */
async function invidiousFetch<T>(path: string): Promise<T> {
  const attempts = INVIDIOUS_INSTANCES.map(async (base) => {
    const res = await fetch(`${base}${path}`, {
      headers: { 'User-Agent': 'Nuclear/1.0' },
      signal: AbortSignal.timeout(INSTANCE_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`${base} returned ${res.status}`);
    }
    return (await res.json()) as T;
  });

  try {
    return await Promise.any(attempts);
  } catch {
    throw new Error('All Invidious instances failed');
  }
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

  // Pick best audio-only adaptive stream by bitrate
  const audioStreams = (data.adaptiveFormats ?? [])
    .filter((f) => f.type?.startsWith('audio/') && f.url)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  const best = audioStreams[0] ?? data.formatStreams?.[0];

  if (!best?.url) {
    throw new Error('Invidious: no audio stream found');
  }

  // Parse container and codec from type string (e.g. 'audio/webm; codecs="opus"')
  let container: string | null = null;
  let codec: string | null = null;
  if (best.type) {
    const typeMatch = best.type.match(/^audio\/([a-zA-Z0-9_-]+)/);
    if (typeMatch) {
      container = typeMatch[1];
    }
    const codecMatch = best.type.match(/codecs="?([^";]+)"?/);
    if (codecMatch) {
      codec = codecMatch[1];
    }
  }

  return {
    stream_url: best.url,
    duration: data.lengthSeconds ? data.lengthSeconds * 1000 : null,
    title: data.title ?? null,
    container,
    codec,
    provider: 'invidious',
  };
}
