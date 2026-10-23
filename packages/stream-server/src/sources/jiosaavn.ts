/**
 * JioSaavn — calls JioSaavn's internal API directly.
 * No third-party instance needed. 320kbps DRM-free streams.
 */

import type { SearchResult, StreamInfo } from './types.js';

// JioSaavn's internal web API — same endpoint their website uses
const BASE = 'https://www.jiosaavn.com/api.php';

async function jioFetch<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
    ...params,
  });

  const res = await fetch(`${BASE}?${query}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.jiosaavn.com/',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`JioSaavn HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// Decode the encrypted download URL JioSaavn returns
function decodeUrl(encoded: string): string {
  try {
    // JioSaavn encodes URLs with a simple substitution cipher
    const key = '38346591';
    let decoded = '';
    for (let i = 0; i < encoded.length; i++) {
      decoded += String.fromCharCode(
        encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }
    return atob(decoded);
  } catch {
    // If decode fails, return as-is (some URLs are plain)
    return encoded;
  }
}

// Replace low-quality URL with 320kbps
function toHighQuality(url: string): string {
  return url
    .replace('_96.mp4', '_320.mp4')
    .replace('_160.mp4', '_320.mp4')
    .replace('_48.mp4', '_320.mp4')
    .replace('http://', 'https://');
}

type JioSong = {
  id?: string;
  song?: string;
  title?: string;
  duration?: string | number;
  image?: string;
  primary_artists?: string;
  encrypted_media_url?: string;
  media_url?: string;
  '320kbps'?: string;
};

type JioSearchResponse = {
  songs?: {
    data?: JioSong[];
  };
};

export async function searchJioSaavn(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  try {
    const data = await jioFetch<JioSearchResponse>({
      __call: 'autocomplete.get',
      query: query,
      includeMetaTags: '0',
    });

    const songs = data.songs?.data ?? [];

    return songs.slice(0, limit).map((song) => ({
      id: `jiosaavn:${song.id ?? ''}`,
      title: song.song ?? song.title ?? '',
      duration: song.duration ? Number(song.duration) : null,
      thumbnail: song.image
        ? song.image.replace('150x150', '500x500')
        : null,
      artist: song.primary_artists ?? null,
      provider: 'jiosaavn' as const,
    }));
  } catch (e) {
    console.warn('[jiosaavn] search failed:', e);
    return [];
  }
}

export async function streamJioSaavn(songId: string): Promise<StreamInfo> {
  const data = await jioFetch<{ songs?: JioSong[] } | JioSong[]>({
    __call: 'song.getDetails',
    pids: songId,
  });

  const songs = Array.isArray(data) ? data : (data.songs ?? [data as JioSong]);
  const song = songs[0] as JioSong;

  if (!song) throw new Error('JioSaavn: song not found');

  // Get stream URL — try encrypted first, then plain
  let url = song.encrypted_media_url
    ? toHighQuality(decodeUrl(song.encrypted_media_url))
    : song.media_url
      ? toHighQuality(song.media_url)
      : null;

  if (!url) throw new Error('JioSaavn: no stream URL found');

  // If 320kbps is available, use it directly
  if (song['320kbps'] === 'true' || song['320kbps'] === true as unknown as string) {
    url = toHighQuality(url);
  }

  return {
    stream_url: url,
    duration: song.duration ? Number(song.duration) * 1000 : null,
    title: song.song ?? song.title ?? null,
    provider: 'jiosaavn',
  };
}
