import type { ArtworkSet } from '@nuclearplayer/model';

/**
 * Get the first artwork URL from an ArtworkSet.
 * ArtworkSet uses { items: Artwork[] } — not an array directly.
 */
export const getArtworkUrl = (artwork?: ArtworkSet): string | undefined =>
  artwork?.items?.[0]?.url;
