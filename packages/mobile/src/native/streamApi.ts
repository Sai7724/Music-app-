/**
 * Stream API client — talks to the Node.js multi-source backend on Render.
 * Sources: YouTube (yt-dlp + Piped)
 */

const BASE_URL = import.meta.env.VITE_STREAM_SERVER_URL ?? '';

if (!BASE_URL) {
  console.error('[streamApi] VITE_STREAM_SERVER_URL is not set.');
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** A search result from any source — provider is encoded in id as "provider:id" */
export type SearchResult = {
  id: string; // e.g. "youtube:dQw4w9WgXcQ"
  title: string;
  duration: number | null; // seconds
  thumbnail: string | null;
  artist: string | null;
  channel: string | null; // channel / uploader name
  provider: 'youtube';
};

export type StreamInfo = {
  stream_url: string;
  duration: number | null; // ms
  title: string | null;
  provider: string;
  // Codec & container metadata for MSE detection
  container?: string | null;
  codec?: string | null;
  mimeType?: string | null;
  // Metadata fields required by YtdlpStreamInfo (plugin-sdk compatibility)
  album?: string | null;
  artists?: string[];
  album_artists?: string[];
  upload_date?: string | null;
};

export type PlaylistEntry = {
  id: string;
  title: string;
  duration: number | null;
  thumbnails: { url: string; width: number | null; height: number | null }[];
  channel: string | null;
};

export type PlaylistInfo = {
  id: string;
  title: string;
  entries: PlaylistEntry[];
};

// Keep legacy type aliases for components that import them
export type YtdlpSearchResult = SearchResult;
export type YtdlpStreamInfo = StreamInfo;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stream API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search all sources (YouTube) in parallel.
 * Returns merged results — no source labels visible to the user.
 */
export async function ytdlpSearch(
  query: string,
  maxResults = 30,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(maxResults),
  });
  const results = await apiFetch<SearchResult[]>(`/api/search?${params}`);
  // Ensure channel field is populated — the server may return artist but not channel
  return results.map((r) => ({
    ...r,
    channel: r.channel ?? r.artist ?? null,
  }));
}

/**
 * Resolve a stream URL for a track.
 * Accepts composite ID ("provider:id") or legacy videoId.
 * Tries multiple sources automatically — caller gets first working URL.
 */
export async function ytdlpGetStream(
  url: string | null,
  videoId: string | null,
  title?: string,
): Promise<StreamInfo> {
  const params = new URLSearchParams();

  // If videoId already contains ":" it's a composite id from new search
  if (videoId) {
    if (videoId.includes(':')) {
      params.set('id', videoId);
    } else {
      params.set('videoId', videoId);
    }
  } else if (url) {
    params.set('url', url);
  }

  if (title) {
    params.set('title', title);
  }

  const info = await apiFetch<StreamInfo>(`/api/stream?${params}`);
  // Ensure metadata fields have defaults for plugin-sdk compatibility
  return {
    ...info,
    album: info.album ?? null,
    artists: info.artists ?? [],
    album_artists: info.album_artists ?? [],
    upload_date: info.upload_date ?? null,
  };
}

/**
 * Fetch playlist metadata via the backend.
 */
export async function ytdlpGetPlaylist(url: string): Promise<PlaylistInfo> {
  const params = new URLSearchParams({ url });
  return apiFetch<PlaylistInfo>(`/api/playlist?${params}`);
}

/** Build a proxied audio URL via the backend proxy (handles CORS on device). */
export function buildProxiedUrl(originalUrl: string): string {
  // Use encodeURIComponent so all characters (including those > 0xFF that
  // would break btoa) are safely percent-encoded before sending as a param.
  console.log('[streamApi] Building proxied URL for:', originalUrl);
  const encoded = encodeURIComponent(originalUrl);
  console.log('[streamApi] Encoded URL:', encoded);
  const result = `${BASE_URL}/api/proxy/stream?u=${encoded}`;
  console.log('[streamApi] Final proxied URL:', result);
  return result;
}
