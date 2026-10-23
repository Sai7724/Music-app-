/**
 * Stream API client — talks to the Node.js backend hosted on Render.
 * Replaces all @tauri-apps/api/core `invoke` calls for ytdlp_* commands.
 *
 * Set VITE_STREAM_SERVER_URL in your .env file:
 *   VITE_STREAM_SERVER_URL=https://nuclear-stream-server.onrender.com
 */

const BASE_URL = import.meta.env.VITE_STREAM_SERVER_URL ?? '';

if (!BASE_URL) {
  console.error(
    '[streamApi] VITE_STREAM_SERVER_URL is not set. ' +
    'Create packages/mobile/.env and set it to your Render URL.',
  );
}

// ── Types (mirror Tauri bindings so existing code stays compatible) ──────────

export type YtdlpSearchResult = {
  id: string;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  channel: string | null;
};

export type YtdlpStreamInfo = {
  stream_url: string;
  duration: number | null;
  title: string | null;
  container: string | null;
  codec: string | null;
  album: string | null;
  artists: string[];
  album_artists: string[];
  upload_date: string | null;
};

export type YtdlpPlaylistEntry = {
  id: string;
  title: string;
  duration: number | null;
  thumbnails: { url: string; width: number | null; height: number | null }[];
  channel: string | null;
};

export type YtdlpPlaylistInfo = {
  id: string;
  title: string;
  entries: YtdlpPlaylistEntry[];
};

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stream API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Search YouTube for tracks. Replaces ytdlp_search Tauri command. */
export async function ytdlpSearch(
  query: string,
  maxResults = 10,
): Promise<YtdlpSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(maxResults),
  });
  return apiFetch<YtdlpSearchResult[]>(`/api/search?${params}`);
}

/**
 * Resolve a stream URL for a video ID or full URL.
 * Replaces ytdlp_get_stream Tauri command.
 */
export async function ytdlpGetStream(
  url: string | null,
  videoId: string | null,
): Promise<YtdlpStreamInfo> {
  const params = new URLSearchParams();
  if (url) params.set('url', url);
  if (videoId) params.set('videoId', videoId);
  return apiFetch<YtdlpStreamInfo>(`/api/stream?${params}`);
}

/** Fetch playlist metadata. Replaces ytdlp_get_playlist Tauri command. */
export async function ytdlpGetPlaylist(url: string): Promise<YtdlpPlaylistInfo> {
  const params = new URLSearchParams({ url });
  return apiFetch<YtdlpPlaylistInfo>(`/api/playlist?${params}`);
}

/**
 * Build a proxied audio URL via the Render stream proxy.
 * Replaces the local stream_server.rs CORS proxy.
 *
 * Capacitor apps on iOS/Android face the same CORS issue as browsers,
 * so we proxy through the server just like the desktop app does locally.
 */
export function buildProxiedUrl(originalUrl: string): string {
  // URL-safe base64 encode
  const encoded = btoa(originalUrl)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${BASE_URL}/api/proxy/stream/${encoded}`;
}
