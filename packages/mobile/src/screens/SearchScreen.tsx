import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  ListPlus,
  Loader2,
  MoreVertical,
  Play,
  Search,
  X,
} from 'lucide-react';
import { FC, useEffect, useRef, useState } from 'react';
import { useSearch } from '@tanstack/react-router';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import { pickArtwork } from '@nuclearplayer/model';

import { ytdlpSearch, type YtdlpSearchResult } from '../native/streamApi';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';

// ── helpers ───────────────────────────────────────────────────────────────────

const toTrack = (result: YtdlpSearchResult): Track => ({
  title: result.title,
  artists: result.channel ? [{ name: result.channel, roles: [] }] : [],
  source: { provider: 'youtube', id: result.id },
  durationMs: result.duration ? result.duration * 1000 : undefined,
  artwork: result.thumbnail
    ? { items: [{ url: result.thumbnail }] }
    : undefined,
});

const formatDuration = (ms: number | undefined): string => {
  if (!ms) return '';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ── Track row (Spotify-style) ─────────────────────────────────────────────────

type TrackRowProps = {
  track: Track;
  isPlaying: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onAddToQueue: () => void;
  onToggleFavorite: () => void;
};

const TrackRow: FC<TrackRowProps> = ({
  track,
  isPlaying,
  isFavorite,
  onPlay,
  onAddToQueue,
  onToggleFavorite,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const artwork = pickArtwork(track.artwork, 'thumbnail', 80);

  // Close menu on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        transition-colors active:bg-primary/10
        ${isPlaying ? 'bg-primary/10' : ''}
      `}
    >
      {/* Thumbnail */}
      <button
        onClick={onPlay}
        className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-card border border-border"
        aria-label={`Play ${track.title}`}
      >
        {artwork?.url ? (
          <img
            src={artwork.url}
            alt={track.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex items-center justify-center opacity-20">
            <Search size={20} />
          </div>
        )}
        {/* Play overlay on tap */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 active:opacity-100 transition-opacity rounded-lg">
          <Play size={18} className="text-white fill-white" />
        </div>
      </button>

      {/* Title + artist — tapping plays */}
      <button
        onClick={onPlay}
        className="flex flex-col min-w-0 flex-1 text-left"
      >
        <span
          className={`
            text-sm font-semibold leading-snug truncate
            ${isPlaying ? 'text-primary' : 'text-foreground'}
          `}
        >
          {track.title}
        </span>
        <span className="text-xs text-muted-foreground truncate mt-0.5">
          {track.artists.map((a) => a.name).join(', ')}
          {track.durationMs && (
            <span className="ml-2 opacity-60">
              {formatDuration(track.durationMs)}
            </span>
          )}
        </span>
      </button>

      {/* Favorite button */}
      <button
        onClick={onToggleFavorite}
        className="shrink-0 p-2 rounded-full active:bg-primary/10 transition-colors"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          size={18}
          className={
            isFavorite
              ? 'fill-primary text-primary'
              : 'text-muted-foreground'
          }
        />
      </button>

      {/* More menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-full active:bg-card transition-colors"
          aria-label="More options"
        >
          <MoreVertical size={18} className="text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-border surface-popover shadow-xl overflow-hidden">
            <button
              onClick={() => { onAddToQueue(); setMenuOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-primary/10 active:bg-primary/10 transition-colors"
            >
              <ListPlus size={16} />
              Add to queue
            </button>
            <button
              onClick={() => { onToggleFavorite(); setMenuOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-primary/10 active:bg-primary/10 transition-colors border-t border-border"
            >
              <Heart
                size={16}
                className={isFavorite ? 'fill-primary text-primary' : ''}
              />
              {isFavorite ? 'Remove favorite' : 'Add to favorites'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Skeleton loader ───────────────────────────────────────────────────────────

const TrackRowSkeleton: FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
    <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <div className="h-3.5 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
    <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
  </div>
);

// ── Main screen ───────────────────────────────────────────────────────────────

export const SearchScreen: FC = () => {
  const { t } = useTranslation('search');
  const searchParams = useSearch({ strict: false }) as { q?: string };

  const [query, setQuery] = useState(searchParams.q ?? '');
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.q ?? '');

  const addToQueue = useQueueStore((s) => s.addToQueue);
  const clearQueue = useQueueStore((s) => s.clearQueue);
  const goToId = useQueueStore((s) => s.goToId);
  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const isTrackFavorite = useFavoritesStore((s) => s.isTrackFavorite);
  const addTrack = useFavoritesStore((s) => s.addTrack);
  const removeTrack = useFavoritesStore((s) => s.removeTrack);

  useEffect(() => {
    if (searchParams.q && searchParams.q !== submittedQuery) {
      setQuery(searchParams.q);
      setSubmittedQuery(searchParams.q);
    }
  }, [searchParams.q]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', submittedQuery],
    queryFn: () => ytdlpSearch(submittedQuery, 30),
    enabled: submittedQuery.trim().length > 0,
  });

  const tracks: Track[] = (results ?? []).map(toTrack);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmittedQuery(query.trim());
  };

  const handlePlay = (track: Track) => {
    addToQueue([track]);
    const items = useQueueStore.getState().items;
    const newItem = items[items.length - 1];
    if (newItem) goToId(newItem.id);
  };

  const handleToggleFavorite = (track: Track) => {
    if (isTrackFavorite(track.source)) {
      void removeTrack(track.source);
    } else {
      addTrack(track);
    }
  };

  return (
    <div
      data-testid="search-view"
      className="flex flex-col h-full overflow-hidden"
      style={{ scrollbarWidth: 'none' } as React.CSSProperties}
    >
      {/* ── Search bar ──────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            className="
              w-full h-11 pl-9 pr-10 rounded-full
              surface-input border border-border
              text-sm placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/50
            "
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSubmittedQuery(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full active:bg-card"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </form>
      </div>

      {/* ── Results header ──────────────────────────────────────── */}
      {submittedQuery && tracks.length > 0 && !isFetching && (
        <div className="shrink-0 flex items-center justify-between px-4 pb-2">
          <span className="text-xs text-muted-foreground">
            {tracks.length} results for &ldquo;{submittedQuery}&rdquo;
          </span>
          <button
            onClick={() => {
              clearQueue();
              addToQueue(tracks);
              const items = useQueueStore.getState().items;
              if (items[0]) goToId(items[0].id);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary active:opacity-70"
          >
            <Play size={12} className="fill-primary" />
            Play all
          </button>
        </div>
      )}

      {/* ── Track list ──────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {/* Loading skeletons */}
        {isFetching && (
          <div className="flex flex-col">
            {Array.from({ length: 8 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty / initial state */}
        {!isFetching && !submittedQuery && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full surface-card flex items-center justify-center">
              <Search size={36} className="text-muted-foreground opacity-50" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('empty.title')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('empty.subtitle')}</p>
            </div>
          </div>
        )}

        {/* No results */}
        {!isFetching && submittedQuery && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full surface-card flex items-center justify-center">
              <Search size={36} className="text-muted-foreground opacity-50" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('noResults')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                No results for &ldquo;{submittedQuery}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Track rows */}
        {!isFetching && tracks.length > 0 && (
          <div className="flex flex-col pb-4">
            {tracks.map((track) => (
              <TrackRow
                key={`${track.source.provider}-${track.source.id}`}
                track={track}
                isPlaying={
                  currentItem?.track.source.id === track.source.id &&
                  currentItem?.track.source.provider === track.source.provider
                }
                isFavorite={isTrackFavorite(track.source)}
                onPlay={() => handlePlay(track)}
                onAddToQueue={() => addToQueue([track])}
                onToggleFavorite={() => handleToggleFavorite(track)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fetching indicator at bottom */}
      {isFetching && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full surface-popover border border-border shadow-lg">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="text-xs font-medium">Searching...</span>
          </div>
        </div>
      )}
    </div>
  );
};
