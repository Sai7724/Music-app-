/**
 * Unified multi-source resolver.
 *
 * Search: queries all sources in parallel, merges results.
 * Stream: tries sources in priority order, returns first success.
 */

import {
  getStream as ytdlpGetStream,
  search as ytdlpSearch,
} from '../ytdlp.js';
import { searchPiped, streamPiped } from './piped.js';
import { searchSoundCloud, streamSoundCloud } from './soundcloud.js';
import type { SearchResult, StreamInfo } from './types.js';

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchAll(
  query: string,
  limit = 30,
): Promise<SearchResult[]> {
  const perSource = Math.ceil(limit / 2);

  const [ytResults, pipedResults, scResults] = await Promise.allSettled([
    ytdlpSearch(query, perSource).then((r) =>
      r.map((item) => ({
        id: `youtube:${item.id}`,
        title: item.title,
        duration: item.duration,
        thumbnail: item.thumbnail,
        artist: item.channel,
        provider: 'youtube' as const,
      })),
    ),
    searchPiped(query, perSource),
    searchSoundCloud(query, Math.floor(perSource / 2)),
  ]);

  const all: SearchResult[] = [];

  if (ytResults.status === 'fulfilled') {
    all.push(...ytResults.value);
  }

  if (pipedResults.status === 'fulfilled') {
    for (const r of pipedResults.value) {
      if (!isDuplicate(r, all)) {
        all.push(r);
      }
    }
  }

  if (scResults.status === 'fulfilled') {
    for (const r of scResults.value) {
      if (!isDuplicate(r, all)) {
        all.push(r);
      }
    }
  }

  console.log(
    `[search] "${query}" → ${all.length} results`,
    `(yt: ${ytResults.status === 'fulfilled' ? ytResults.value.length : 'err'},`,
    `piped: ${pipedResults.status === 'fulfilled' ? pipedResults.value.length : 'err'},`,
    `sc: ${scResults.status === 'fulfilled' ? scResults.value.length : 'err'})`,
  );

  return all.slice(0, limit);
}

// ── Stream resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a stream URL for a given track ID.
 * ID format: "provider:id"  e.g. "youtube:dQw4w9WgXcQ"
 *
 * Strategy order for YouTube:
 *   1. yt-dlp (tv+mweb client, works with YOUTUBE_COOKIES env var)
 *   2. Invidious/Piped (no auth needed, unreliable public instances)
 *   3. SoundCloud title-match (completely avoids YouTube, last resort)
 */
export async function resolveStream(
  compositeId: string,
  title?: string,
): Promise<StreamInfo> {
  const [provider, id] = compositeId.split(':');

  if (provider === 'soundcloud') {
    return streamSoundCloud(id);
  }

  if (provider === 'youtube') {
    const strategies: Array<{ name: string; fn: () => Promise<StreamInfo> }> = [
      {
        name: 'ytdlp',
        fn: () =>
          ytdlpGetStream(id).then((r) => ({
            stream_url: r.stream_url,
            duration: r.duration,
            title: r.title,
            container: r.container,
            codec: r.codec,
            provider: 'ytdlp',
          })),
      },
      {
        name: 'invidious',
        fn: () => streamPiped(id),
      },
    ];

    // SoundCloud title-match: completely avoids YouTube bot detection
    if (title) {
      strategies.push({
        name: 'soundcloud',
        fn: async () => {
          const results = await searchSoundCloud(title, 1);
          const first = results[0];
          if (!first) {
            throw new Error('No SoundCloud match found');
          }
          const scId = first.id.replace('soundcloud:', '');
          return streamSoundCloud(scId);
        },
      });
    }

    let lastError: Error | null = null;
    for (const { name, fn } of strategies) {
      try {
        console.log(`[stream] trying ${name} for ${compositeId}`);
        const result = await fn();
        if (result.stream_url) {
          console.log(`[stream] resolved "${compositeId}" via ${name}`);
          return result;
        }
        throw new Error(`${name}: empty stream_url`);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(
          `[stream] ${name} failed for ${compositeId}:`,
          lastError.message,
        );
      }
    }

    throw lastError ?? new Error(`Could not resolve stream for ${compositeId}`);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isDuplicate(
  candidate: SearchResult,
  existing: SearchResult[],
): boolean {
  const cTitle = normalize(candidate.title);
  const cArtist = normalize(candidate.artist ?? '');
  return existing.some((e) => {
    const eTitle = normalize(e.title);
    const eArtist = normalize(e.artist ?? '');
    return (
      eTitle === cTitle &&
      (cArtist === '' || eArtist === '' || eArtist === cArtist)
    );
  });
}
