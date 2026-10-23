import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { FC, useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import { Button, EmptyState, Input, TrackTable, ViewShell } from '@nuclearplayer/ui';

import { useTrackTableLabels } from '../hooks/useTrackTableLabels';
import { ytdlpSearch, type YtdlpSearchResult } from '../native/streamApi';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';

const toTrack = (result: YtdlpSearchResult): Track => ({
  title: result.title,
  artists: result.channel ? [{ name: result.channel, roles: [] }] : [],
  source: { provider: 'youtube', id: result.id },
  durationMs: result.duration ? result.duration * 1000 : undefined,
  artwork: result.thumbnail
    ? { items: [{ url: result.thumbnail }] }
    : undefined,
});

export const SearchScreen: FC = () => {
  const { t } = useTranslation('search');
  const searchParams = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState(searchParams.q ?? '');
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.q ?? '');

  const labels = useTrackTableLabels();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const clearQueue = useQueueStore((s) => s.clearQueue);
  const goToId = useQueueStore((s) => s.goToId);
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
    if (query.trim()) {
      setSubmittedQuery(query.trim());
    }
  };

  const handlePlayNow = (track: Track) => {
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
    <ViewShell data-testid="search-view" title={t('title')}>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4 max-w-xl">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          className="flex-1"
        />
        <Button type="submit" disabled={isFetching || !query.trim()}>
          {isFetching ? '...' : t('title')}
        </Button>
      </form>

      {!submittedQuery && (
        <EmptyState
          icon={<Search size={48} />}
          title={t('empty.title')}
          description={t('empty.subtitle')}
          className="flex-1"
        />
      )}

      {submittedQuery && tracks.length === 0 && !isFetching && (
        <EmptyState
          icon={<Search size={48} />}
          title={t('noResults')}
          description={submittedQuery}
          className="flex-1"
        />
      )}

      {tracks.length > 0 && (
        <TrackTable
          tracks={tracks}
          labels={labels}
          features={{
            header: true,
            sortable: true,
            playAll: true,
            addAllToQueue: true,
            favorites: true,
          }}
          display={{
            displayThumbnail: true,
            displayArtist: true,
            displayDuration: true,
            displayFavorite: true,
            displayQueueControls: true,
          }}
          actions={{
            onPlayNow: handlePlayNow,
            onAddToQueue: (track) => addToQueue([track]),
            onToggleFavorite: handleToggleFavorite,
            onPlayAll: () => {
              clearQueue();
              addToQueue(tracks);
            },
            onAddAllToQueue: () => {
              addToQueue(tracks);
            },
          }}
          meta={{
            isTrackFavorite: (track) => isTrackFavorite(track.source),
          }}
        />
      )}
    </ViewShell>
  );
};
