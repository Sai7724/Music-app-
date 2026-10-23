import { Music } from 'lucide-react';
import { FC, useMemo } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import { EmptyState, TrackTable, ViewShell } from '@nuclearplayer/ui';

import { useTrackTableLabels } from '../hooks/useTrackTableLabels';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';

export const FavoriteTracksScreen: FC = () => {
  const { t } = useTranslation('favorites');
  const favorites = useFavoritesStore((s) => s.tracks);
  const isTrackFavorite = useFavoritesStore((s) => s.isTrackFavorite);
  const addTrack = useFavoritesStore((s) => s.addTrack);
  const removeTrack = useFavoritesStore((s) => s.removeTrack);

  const addToQueue = useQueueStore((s) => s.addToQueue);
  const clearQueue = useQueueStore((s) => s.clearQueue);
  const goToId = useQueueStore((s) => s.goToId);

  const labels = useTrackTableLabels();

  const sortedTracks: Track[] = useMemo(
    () =>
      [...favorites]
        .sort(
          (a, b) =>
            new Date(b.addedAtIso).getTime() - new Date(a.addedAtIso).getTime(),
        )
        .map((entry) => entry.ref),
    [favorites],
  );

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
    <ViewShell data-testid="favorite-tracks-view" title={t('tracks.title')}>
      {sortedTracks.length === 0 ? (
        <EmptyState
          icon={<Music size={48} />}
          title={t('tracks.empty')}
          description={t('tracks.emptyDescription')}
          className="flex-1"
        />
      ) : (
        <TrackTable
          tracks={sortedTracks}
          labels={labels}
          features={{
            header: true,
            filterable: true,
            sortable: true,
            playAll: true,
            addAllToQueue: true,
            favorites: true,
            contextMenu: false,
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
              addToQueue(sortedTracks);
            },
            onAddAllToQueue: () => {
              addToQueue(sortedTracks);
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
