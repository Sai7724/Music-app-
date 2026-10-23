/**
 * JioSaavn — unofficial API, no auth, 320kbps streams.
 * Huge Hindi + English library.
 */

import type { SearchResult, StreamInfo } from './types.js';

const BASE = 'https://saavn.dev/api';

async function saavnFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': 'Nuclear/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`JioSaavn ${res.status}`);
  return res.json() as Promise<T>;
}

type SaavnSong = {
  id?: string;
  name?: string;
  duration?: number | string;
  image?: Array<{ quality?: string; url?: string }>;
  artists?: { primary?: Array<{ name?: string }> };
  downloadUrl?: Array<{ quality?: string; url?: string }>;
};

type SaavnSearchResponse = {
  data?: {
    results?: SaavnSong[];
  };
};

type SaavnSongResponse = {
  data?: SaavnSong[];
};

function pickImage(images?: SaavnSong['image']): string | null {
  if (!images?.length) return null;
  // prefer 500x500
  return (
    images.find((i) => i.quality === '500x500')?.url ??
    images[images.length - 1]?.url ??
    null
  );
}

function pickDownloadUrl(urls?: SaavnSong['downloadUrl']): string | null {
  if (!urls?.length) return null;
  // prefer 320kbps
  return (
    urls.find((u) => u.quality === '320kbps')?.url ??
    urls.find((u) => u.quality === '160kbps')?.url ??
    urls[urls.length - 1]?.url ??
    null
  );
}

export async function searchJioSaavn(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  try {
    const data = await saavnFetch<SaavnSearchResponse>(
      `/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
    );

    return (data.data?.results ?? []).map((song) => ({
      id: `jiosaavn:${song.id ?? ''}`,
      title: song.name ?? '',
      duration: song.duration ? Number(song.duration) : null,
      thumbnail: pickImage(song.image),
      artist: song.artists?.primary?.[0]?.name ?? null,
      provider: 'jiosaavn' as const,
    }));
  } catch (e) {
    console.warn('[jiosaavn] search failed:', e);
    return [];
  }
}

export async function streamJioSaavn(songId: string): Promise<StreamInfo> {
  const data = await saavnFetch<SaavnSongResponse>(
    `/songs?id=${encodeURIComponent(songId)}`,
  );

  const song = data.data?.[0];
  if (!song) throw new Error('JioSaavn: song not found');

  const url = pickDownloadUrl(song.downloadUrl);
  if (!url) throw new Error('JioSaavn: no download URL');

  return {
    stream_url: url,
    duration: song.duration ? Number(song.duration) * 1000 : null,
    title: song.name ?? null,
    provider: 'jiosaavn',
  };
}
