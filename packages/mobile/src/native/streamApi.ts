/**
 * Stream API client — talks to the Node.js multi-source backend on Render.
 * Sources: YouTube (yt-dlp + Piped), JioSaavn, SoundCloud
 */

const BASE_URL = import.meta.env.VITE_STREAM_SERVER_URL ?? '';

if (!BASE_URL) {
  console.error('[streamApi] VITE_STREAM_SERVER_URL is not set.');
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** A search result from any source — provider is encoded in id as "provider:id" */
export type SearchResult = {
  id: string; // e.g. "youtube:dQw4w9WgXcQ" | "jiosaavn:abc" | "soundcloud:123"
  title: string;
  duration: number | null; // seconds
  thumbnail: string | null;
  artist: string | null;
  provider: 'youtube' | 'jiosaavn' | 'soundcloud';
};

export type StreamInfo = {
  stream_url: string;
  duration: number | null; // ms
  title: string | null;
  provider: string;
  // Legacy fields for compatibility
  container?: string | null;
  codec?: string | null;
};

// Keep legacy type alias for components that import YtdlpSearchResult
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
 * Search all sources (YouTube, JioSaavn, SoundCloud) in parallel.
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
  return apiFetch<SearchResult[]>(`/api/search?${params}`);
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

  return apiFetch<StreamInfo>(`/api/stream?${params}`);
}

/** Build a proxied audio URL via the backend proxy (handles CORS on device). */
export function buildProxiedUrl(originalUrl: string): string {
  // Use encodeURIComponent so all characters (including those > 0xFF that
  // would break btoa) are safely percent-encoded before sending as a param.
  return `${BASE_URL}/api/proxy/stream?u=${encodeURIComponent(originalUrl)}`;
}
