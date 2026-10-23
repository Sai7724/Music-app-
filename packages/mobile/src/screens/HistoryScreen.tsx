import { useQuery } from '@tanstack/react-query';
import { History, Trash2 } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import { Button, EmptyState, HistoryRow, ViewShell } from '@nuclearplayer/ui';

import { clearHistory, getHistory } from '../services/historyService';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';

export const HistoryScreen: FC = () => {
  const { t } = useTranslation('history');
  const { t: tTrack } = useTranslation('track');

  const addToQueue = useQueueStore((s) => s.addToQueue);
  const goToId = useQueueStore((s) => s.goToId);
  const isTrackFavorite = useFavoritesStore((s) => s.isTrackFavorite);
  const addTrack = useFavoritesStore((s) => s.addTrack);
  const removeTrack = useFavoritesStore((s) => s.removeTrack);

  const { data, refetch } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(100, 0),
  });

  const handleClear = async () => {
    await clearHistory();
    void refetch();
  };

  const toTrack = (entry: NonNullable<typeof data>['items'][number]): Track => ({
    title: entry.title,
    artists: entry.artists.map((name) => ({ name, roles: [] })),
    source: {
      provider: entry.provider ?? 'youtube',
      id: entry.providerId ?? '',
    },
    durationMs: entry.durationMs ?? undefined,
    artwork: entry.artworkUrl
      ? { items: [{ url: entry.artworkUrl }] }
      : undefined,
  });

  const handlePlayNow = (entry: NonNullable<typeof data>['items'][number]) => {
    const track = toTrack(entry);
    addToQueue([track]);
    const items = useQueueStore.getState().items;
    const newItem = items[items.length - 1];
    if (newItem) goToId(newItem.id);
  };

  const handleToggleFavorite = (entry: NonNullable<typeof data>['items'][number]) => {
    const track = toTrack(entry);
    if (isTrackFavorite(track.source)) {
      void removeTrack(track.source);
    } else {
      addTrack(track);
    }
  };

  const hasHistory = Boolean(data && data.items.length > 0);

  return (
    <ViewShell data-testid="history-view" title={t('title')}>
      {hasHistory && (
        <div className="flex justify-end mb-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void handleClear()}
            className="flex items-center gap-1.5 text-destructive"
          >
            <Trash2 size={16} />
            <span>{t('clear')}</span>
          </Button>
        </div>
      )}

      {!hasHistory ? (
        <EmptyState
          icon={<History size={48} />}
          title={t('empty.title')}
          description={t('empty.subtitle')}
          className="flex-1"
        />
      ) : (
        <div className="flex flex-col overflow-hidden rounded-md border border-border">
          {data!.items.map((entry) => {
            const track = toTrack(entry);
            const isFav = isTrackFavorite(track.source);
            return (
              <HistoryRow
                key={entry.playId}
                title={entry.title}
                artist={entry.artists.join(', ')}
                time={new Date(entry.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                artworkUrl={entry.artworkUrl}
                isFavorite={isFav}
                onToggleFavorite={() => handleToggleFavorite(entry)}
                onPlayNow={() => handlePlayNow(entry)}
                onAddToQueue={() => addToQueue([track])}
                labels={{
                  favorite: tTrack('actions.addToFavorites'),
                  unfavorite: tTrack('actions.removeFromFavorites'),
                  addToQueue: tTrack('actions.addToQueue'),
                }}
              />
            );
          })}
        </div>
      )}
    </ViewShell>
  );
};
