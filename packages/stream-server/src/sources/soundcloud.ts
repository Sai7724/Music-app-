/**
 * SoundCloud — unofficial client ID approach.
 * No auth needed beyond a public client ID.
 * Great for independent artists and remixes.
 */

import type { SearchResult, StreamInfo } from './types.js';

const BASE = 'https://api.soundcloud.com';

// SoundCloud requires a client_id — this is a public one used by open source players
// If it stops working, grab a new one from: https://soundcloud.com (check network tab)
const CLIENT_ID =
  process.env.SOUNDCLOUD_CLIENT_ID ?? 'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX';

async function scFetch<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}client_id=${CLIENT_ID}`, {
    headers: { 'User-Agent': 'Nuclear/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`SoundCloud ${res.status}`);
  return res.json() as Promise<T>;
}

type SCTrack = {
  id?: number;
  title?: string;
  duration?: number;
  artwork_url?: string;
  user?: { username?: string };
  streamable?: boolean;
};

type SCSearchResponse = {
  collection?: SCTrack[];
};

type SCStreamResponse = {
  url?: string;
  http_mp3_128_url?: string;
};

export async function searchSoundCloud(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  try {
    const data = await scFetch<SCSearchResponse>(
      `/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}`,
    );

    return (data.collection ?? [])
      .filter((t) => t.streamable !== false)
      .map((track) => ({
        id: `soundcloud:${track.id ?? ''}`,
        title: track.title ?? '',
        duration: track.duration ? Math.floor(track.duration / 1000) : null,
        thumbnail: track.artwork_url?.replace('-large', '-t300x300') ?? null,
        artist: track.user?.username ?? null,
        provider: 'soundcloud' as const,
      }));
  } catch (e) {
    console.warn('[soundcloud] search failed:', e);
    return [];
  }
}

export async function streamSoundCloud(trackId: string): Promise<StreamInfo> {
  // Get the stream URL
  const data = await scFetch<SCStreamResponse>(
    `/tracks/${trackId}/streams`,
  );

  const url = data.http_mp3_128_url ?? data.url;
  if (!url) throw new Error('SoundCloud: no stream URL');

  return {
    stream_url: url,
    duration: null,
    title: null,
    provider: 'soundcloud',
  };
}
