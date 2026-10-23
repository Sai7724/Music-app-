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
import { searchJioSaavn, streamJioSaavn } from './jiosaavn.js';
import { searchPiped, streamPiped } from './piped.js';
import { searchSoundCloud, streamSoundCloud } from './soundcloud.js';
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
  const perSource = Math.ceil(limit / 2); // each source contributes up to half

  const [ytResults, saavnResults, scResults, pipedResults] =
    await Promise.allSettled([
      // yt-dlp with cookies (most comprehensive)
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
      // JioSaavn (best for Hindi/English pop, no bot issues)
      searchJioSaavn(query, perSource),
      // SoundCloud (indie/remixes)
      searchSoundCloud(query, Math.floor(perSource / 2)),
      // Piped as YouTube fallback
      searchPiped(query, perSource),
    ]);

  const all: SearchResult[] = [];

  // Prefer JioSaavn first (reliable, high quality)
  if (saavnResults.status === 'fulfilled') {
    all.push(...saavnResults.value);
  }

  // Then yt-dlp YouTube
  if (ytResults.status === 'fulfilled') {
    for (const r of ytResults.value) {
      if (!isDuplicate(r, all)) {
        all.push(r);
      }
    }
  }

  // Then Piped YouTube (dedup against yt-dlp results)
  if (pipedResults.status === 'fulfilled') {
    for (const r of pipedResults.value) {
      if (!isDuplicate(r, all)) {
        all.push(r);
      }
    }
  }

  // Then SoundCloud
  if (scResults.status === 'fulfilled') {
    for (const r of scResults.value) {
      if (!isDuplicate(r, all)) {
        all.push(r);
      }
    }
  }

  console.log(
    `[search] "${query}" → ${all.length} results`,
    `(saavn: ${saavnResults.status === 'fulfilled' ? saavnResults.value.length : 'err'},`,
    `yt: ${ytResults.status === 'fulfilled' ? ytResults.value.length : 'err'},`,
    `piped: ${pipedResults.status === 'fulfilled' ? pipedResults.value.length : 'err'},`,
    `sc: ${scResults.status === 'fulfilled' ? scResults.value.length : 'err'})`,
  );

  return all.slice(0, limit);
}

// ── Stream resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a stream URL for a given track ID.
 * ID format: "provider:id"  e.g. "youtube:dQw4w9WgXcQ", "jiosaavn:abc123"
 *
 * For YouTube IDs, tries multiple providers as fallback:
 *   1. JioSaavn match (if title known)
 *   2. Piped (no bot detection)
 *   3. yt-dlp + cookies
 *   4. SoundCloud (last resort)
 */
export async function resolveStream(
  compositeId: string,
  title?: string,
): Promise<StreamInfo> {
  const [provider, id] = compositeId.split(':');

  // ── Direct resolution by provider ────────────────────────────────
  if (provider === 'jiosaavn') {
    return streamJioSaavn(id);
  }

  if (provider === 'soundcloud') {
    return streamSoundCloud(id);
  }

  if (provider === 'youtube') {
    // Try in priority order — first success wins
    const strategies: Array<{ name: string; fn: () => Promise<StreamInfo> }> = [
      // 1. Piped / Invidious (no auth, no bot issues, fastest)
      { name: 'invidious', fn: () => streamPiped(id) },
      // 2. yt-dlp + cookies (most reliable when cookies are set; uses android
      //    player client to bypass age-gate / bot detection on cloud servers)
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

    // If we have a title, prepend a JioSaavn cross-source match (no YouTube
    // bot detection at all) and append a SoundCloud last-resort fallback.
    if (title) {
      strategies.unshift({
        name: 'jiosaavn',
        fn: async () => {
          const results = await searchJioSaavn(title, 1);
          const first = results[0];
          if (!first) {
            throw new Error('No JioSaavn match');
          }
          const saavnId = first.id.replace('jiosaavn:', '');
          return streamJioSaavn(saavnId);
        },
      });

      strategies.push({
        name: 'soundcloud',
        fn: async () => {
          const results = await searchSoundCloud(title, 1);
          const first = results[0];
          if (!first) {
            throw new Error('No SoundCloud match');
          }
          const scId = first.id.replace('soundcloud:', '');
          return streamSoundCloud(scId);
        },
      });
    }

    let lastError: Error | null = null;
    for (const { name, fn } of strategies) {
      try {
        const result = await fn();
        if (result.stream_url) {
          console.log(`[stream] resolved "${compositeId}" via ${name}`);
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
        continue;
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
    // Same title and same artist = duplicate
    return (
      eTitle === cTitle &&
      (cArtist === '' || eArtist === '' || eArtist === cArtist)
    );
  });
}
