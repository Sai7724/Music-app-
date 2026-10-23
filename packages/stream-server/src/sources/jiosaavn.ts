/**
 * JioSaavn — calls JioSaavn's internal API directly.
 * No third-party instance needed. 320kbps DRM-free streams.
 */

import type { SearchResult, StreamInfo } from './types.js';

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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.jiosaavn.com/',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`JioSaavn HTTP ${res.status}`);
  }

  const text = await res.text();
  // JioSaavn sometimes prepends ")]}',\n" to responses
  const cleaned = text.replace(/^\)\]\}',?\s*\n?/, '');
  return JSON.parse(cleaned) as T;
}

function toHighQuality(url: string): string {
  return url
    .replace(/_96\.mp4/, '_320.mp4')
    .replace(/_160\.mp4/, '_320.mp4')
    .replace(/_48\.mp4/, '_320.mp4')
    .replace(/^http:\/\//, 'https://');
}

/**
 * Decode JioSaavn's encrypted_media_url.
 *
 * JioSaavn applies a lightweight substitution cipher before base64-encoding
 * the URL.  The cipher replaces characters using a fixed 64-char alphabet
 * derived from the standard base64 alphabet, then applies a standard
 * base64 decode.
 *
 * Equivalent to the well-known community reverse-engineering:
 *   https://github.com/cyberboysumanjay/JioSaavnAPI
 */
function decodeMediaUrl(encoded: string): string {
  try {
    // JioSaavn pads with '=' characters; strip them for the cipher step
    const trimmed = encoded.replace(/=+$/, '');

    // Step 1 — character-level Caesar-style substitution on the base64 chars
    const b64chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let substituted = '';
    for (const ch of trimmed) {
      const idx = b64chars.indexOf(ch);
      if (idx === -1) {
        substituted += ch;
      } else {
        // Rotate each character by a fixed offset within the alphabet (60)
        substituted += b64chars[(idx + 60) % 64];
      }
    }

    // Re-pad to a multiple of 4
    const pad = substituted.length % 4;
    const padded = pad ? substituted + '='.repeat(4 - pad) : substituted;

    return atob(padded);
  } catch {
    // If the cipher fails, return as-is so plainUrl fallback can take over
    return '';
  }
}

type JioSong = {
  id?: string;
  song?: string;
  title?: string;
  duration?: string | number;
  image?: string;
  primary_artists?: string;
  more_info?: {
    encrypted_media_url?: string;
    media_url?: string;
    '320kbps'?: string;
  };
  encrypted_media_url?: string;
  media_url?: string;
};

type JioSearchResponse = {
  results?: JioSong[];
  data?: JioSong[];
};

export async function searchJioSaavn(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  try {
    const data = await jioFetch<JioSearchResponse>({
      __call: 'search.getResults',
      p: '1',
      q: query,
      n: String(limit),
    });

    const songs = data.results ?? data.data ?? [];

    return songs.slice(0, limit).map((song) => ({
      id: `jiosaavn:${song.id ?? ''}`,
      title: song.song ?? song.title ?? '',
      duration: song.duration ? Number(song.duration) : null,
      thumbnail: song.image
        ? song.image
            .replace('150x150', '500x500')
            .replace(/^http:\/\//, 'https://')
        : null,
      artist: song.primary_artists ?? null,
      provider: 'jiosaavn' as const,
    }));
  } catch (e) {
    console.warn('[jiosaavn] search failed:', String(e));
    return [];
  }
}

export async function streamJioSaavn(songId: string): Promise<StreamInfo> {
  const data = await jioFetch<{ songs?: JioSong[] } | JioSong[] | JioSong>({
    __call: 'song.getDetails',
    pids: songId,
  });

  let song: JioSong | undefined;

  if (Array.isArray(data)) {
    song = data[0];
  } else if (
    'songs' in data &&
    Array.isArray((data as { songs?: JioSong[] }).songs)
  ) {
    song = (data as { songs: JioSong[] }).songs[0];
  } else {
    song = data as JioSong;
  }

  if (!song?.id) {
    throw new Error('JioSaavn: song not found');
  }

  // Try encrypted URL first (from more_info), then top-level
  const encryptedUrl =
    song.more_info?.encrypted_media_url ?? song.encrypted_media_url;
  const plainUrl = song.more_info?.media_url ?? song.media_url;

  let streamUrl: string | null = null;

  if (encryptedUrl) {
    try {
      streamUrl = toHighQuality(decodeMediaUrl(encryptedUrl));
    } catch {
      streamUrl = null;
    }
  }

  if (!streamUrl && plainUrl) {
    streamUrl = toHighQuality(plainUrl);
  }

  if (!streamUrl) {
    throw new Error('JioSaavn: no stream URL found');
  }

  return {
    stream_url: streamUrl,
    duration: song.duration ? Number(song.duration) * 1000 : null,
    title: song.song ?? song.title ?? null,
    provider: 'jiosaavn',
  };
}
