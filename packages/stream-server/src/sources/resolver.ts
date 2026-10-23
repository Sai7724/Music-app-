/**
 * Unified multi-source resolver.
 *
 * Search: queries all sources in parallel, merges results.
 * Stream: tries sources in priority order, returns first success.
 *
 * The caller (and the mobile app) never needs to know which
 * source provided the result.
 */

import {
  getStream as ytdlpGetStream,
  search as ytdlpSearch,
} from '../ytdlp.js';
import { searchPiped, streamPiped } from './piped.js';
import type { SearchResult, StreamInfo } from './types.js';

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Search all sources in parallel and merge results.
 * Deduplicates by title+artist similarity.
 * Returns a flat list — no source labels exposed.
 */
export async function searchAll(
  query: string,
  limit = 30,
): Promise<SearchResult[]> {
  const perSource = Math.ceil(limit / 2);

  const [ytResults, pipedResults] = await Promise.allSettled([
    // yt-dlp (most comprehensive)
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
    // Invidious/Piped as YouTube fallback
    searchPiped(query, perSource),
  ]);

  const all: SearchResult[] = [];

  // yt-dlp YouTube first
  if (ytResults.status === 'fulfilled') {
    all.push(...ytResults.value);
  }

  // Piped YouTube (dedup against yt-dlp results)
  if (pipedResults.status === 'fulfilled') {
    for (const r of pipedResults.value) {
      if (!isDuplicate(r, all)) {
        all.push(r);
      }
    }
  }

  console.log(
    `[search] "${query}" → ${all.length} results`,
    `(yt: ${ytResults.status === 'fulfilled' ? ytResults.value.length : 'err'},`,
    `piped: ${pipedResults.status === 'fulfilled' ? pipedResults.value.length : 'err'})`,
  );

  return all.slice(0, limit);
}

// ── Stream resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a stream URL for a given track ID.
 * ID format: "provider:id"  e.g. "youtube:dQw4w9WgXcQ"
 *
 * For YouTube IDs, tries in order:
 *   1. Invidious/Piped (no bot detection)
 *   2. yt-dlp android client (bypasses age-gate on cloud)
 */
export async function resolveStream(compositeId: string): Promise<StreamInfo> {
  const [provider, id] = compositeId.split(':');

  if (provider === 'youtube') {
    // Try in priority order — first success wins
    const strategies: Array<{ name: string; fn: () => Promise<StreamInfo> }> = [
      // 1. Piped / Invidious (no auth, no bot issues, fastest)
      { name: 'invidious', fn: () => streamPiped(id) },
      // 2. yt-dlp android client — most reliable fallback
      {
        name: 'ytdlp',
        fn: () =>
          ytdlpGetStream(id).then((r) => ({
            stream_url: r.stream_url,
            duration: r.duration,
            title: r.title,
            provider: 'ytdlp',
          })),
      },
    ];

    let lastError: Error | null = null;
    let primaryError: Error | null = null; // Track error from primary sources

    for (const { name, fn } of strategies) {
      try {
        console.log(`[stream] Trying strategy ${name} for ${compositeId}`);
        const result = await fn();
        if (result.stream_url) {
          console.log(
            `[stream] resolved "${compositeId}" via ${name}, URL:`,
            result.stream_url,
          );
          return result;
        }
        // strategy returned empty URL — treat as failure
        throw new Error(`${name}: empty stream_url`);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(
          `[stream] strategy failed for ${compositeId}: ${name}:`,
          lastError.message,
        );
        // Track primary source errors
        primaryError = lastError;
        continue;
      }
    }

    // Throw the primary source error if available, otherwise the last error
    throw (
      primaryError ??
      lastError ??
      new Error(`Could not resolve stream for ${compositeId}`)
    );
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
