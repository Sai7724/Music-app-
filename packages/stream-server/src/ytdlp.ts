/**
 * yt-dlp wrapper using youtube-dl-exec.
 * This package auto-downloads the yt-dlp binary on first run.
 */
import { writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { youtubeDl } from 'youtube-dl-exec';

// Write YouTube cookies from env to a temp file once on startup
let cookiesPath: string | undefined;

const cookiesContent = process.env.YOUTUBE_COOKIES;
if (cookiesContent) {
  cookiesPath = join(tmpdir(), 'yt-cookies.txt');
  try {
    writeFileSync(cookiesPath, cookiesContent, 'utf-8');
    console.log('[ytdlp] Cookies loaded from YOUTUBE_COOKIES env var');
  } catch (e) {
    console.error('[ytdlp] Failed to write cookies file:', e);
    cookiesPath = undefined;
  }
} else {
  console.warn('[ytdlp] No YOUTUBE_COOKIES set — may hit bot detection on cloud');
}

// Add cookies to any yt-dlp options if available
function withCookies(opts: Record<string, unknown>): Record<string, unknown> {
  if (cookiesPath && existsSync(cookiesPath)) {
    return { ...opts, cookies: cookiesPath };
  }
  return opts;
}

export type SearchResult = {
  id: string;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  channel: string | null;
};

export type StreamInfo = {
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

/** Search YouTube for tracks matching `query`. */
export async function search(
  query: string,
  maxResults = 10,
): Promise<SearchResult[]> {
  const output = await youtubeDl(`ytsearch${maxResults}:${query}`, withCookies({
    dumpSingleJson: true,
    noWarnings: true,
    
    preferFreeFormats: true,
    skipDownload: true,
    flatPlaylist: true,
  }) as Parameters<typeof youtubeDl>[1]);

  const data = output as { entries?: unknown[] };
  const entries: unknown[] = data.entries ?? [];

  return entries.map((entry) => {
    const e = entry as Record<string, unknown>;
    return {
      id: String(e.id ?? ''),
      title: String(e.title ?? ''),
      duration: typeof e.duration === 'number' ? e.duration : null,
      thumbnail:
        typeof e.thumbnail === 'string'
          ? e.thumbnail
          : pickThumbnail(e.thumbnails),
      channel: typeof e.channel === 'string' ? e.channel : null,
    };
  });
}

/** Resolve a direct stream URL for a YouTube video ID or full URL. */
export async function getStream(urlOrId: string): Promise<StreamInfo> {
  const url = urlOrId.startsWith('http')
    ? urlOrId
    : `https://www.youtube.com/watch?v=${urlOrId}`;

  const output = await youtubeDl(url, withCookies({
    dumpSingleJson: true,
    noWarnings: true,
    
    preferFreeFormats: true,
    skipDownload: true,
    format: 'bestaudio[ext=m4a]/bestaudio/best',
  }) as Parameters<typeof youtubeDl>[1]);

  const data = output as Record<string, unknown>;

  const formats = data.requested_formats as Record<string, unknown>[] | undefined;
  const streamUrl =
    (formats?.[0]?.url as string | undefined) ??
    (data.url as string | undefined) ??
    '';

  return {
    stream_url: streamUrl,
    duration: typeof data.duration === 'number' ? data.duration * 1000 : null,
    title: typeof data.title === 'string' ? data.title : null,
    container: resolveContainer(data, formats),
    codec: resolveCodec(data, formats),
    album: typeof data.album === 'string' ? data.album : null,
    artists: parseStringArray(data.artists),
    album_artists: parseStringArray(data.album_artists),
    upload_date: typeof data.upload_date === 'string' ? data.upload_date : null,
  };
}

/** Fetch playlist metadata without downloading. */
export async function getPlaylist(url: string): Promise<PlaylistInfo> {
  const output = await youtubeDl(url, withCookies({
    dumpSingleJson: true,
    noWarnings: true,
    
    flatPlaylist: true,
    skipDownload: true,
  }) as Parameters<typeof youtubeDl>[1]);

  const data = output as Record<string, unknown>;
  const entries = (data.entries as Record<string, unknown>[] | undefined) ?? [];

  return {
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    entries: entries.map((entry) => ({
      id: String(entry.id ?? ''),
      title: String(entry.title ?? ''),
      duration: typeof entry.duration === 'number' ? entry.duration : null,
      thumbnails: parseThumbnails(entry.thumbnails),
      channel: typeof entry.channel === 'string' ? entry.channel : null,
    })),
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function pickThumbnail(thumbnails: unknown): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
  const best = thumbnails[thumbnails.length - 1] as Record<string, unknown>;
  return typeof best.url === 'string' ? best.url : null;
}

function parseThumbnails(
  thumbnails: unknown,
): { url: string; width: number | null; height: number | null }[] {
  if (!Array.isArray(thumbnails)) return [];
  return thumbnails.map((t) => {
    const thumb = t as Record<string, unknown>;
    return {
      url: String(thumb.url ?? ''),
      width: typeof thumb.width === 'number' ? thumb.width : null,
      height: typeof thumb.height === 'number' ? thumb.height : null,
    };
  });
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function resolveContainer(
  data: Record<string, unknown>,
  formats?: Record<string, unknown>[],
): string | null {
  const ext =
    (formats?.[0]?.ext as string | undefined) ?? (data.ext as string | undefined);
  return ext ?? null;
}

function resolveCodec(
  data: Record<string, unknown>,
  formats?: Record<string, unknown>[],
): string | null {
  const acodec =
    (formats?.[0]?.acodec as string | undefined) ??
    (data.acodec as string | undefined);
  if (!acodec || acodec === 'none') return null;
  return acodec;
}
