import { Disc3 } from 'lucide-react';
import { FC, useMemo } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Card, CardGrid, EmptyState, ViewShell } from '@nuclearplayer/ui';

import { useFavoritesStore } from '../stores/favoritesStore';

export const FavoriteAlbumsScreen: FC = () => {
  const { t } = useTranslation('favorites');
  const albums = useFavoritesStore((s) => s.albums);

  const sortedAlbums = useMemo(
    () =>
      [...albums].sort(
        (a, b) =>
          new Date(b.addedAtIso).getTime() - new Date(a.addedAtIso).getTime(),
      ),
    [albums],
  );

  return (
    <ViewShell data-testid="favorite-albums-view" title={t('albums.title')}>
      {sortedAlbums.length === 0 ? (
        <EmptyState
          icon={<Disc3 size={48} />}
          title={t('albums.empty')}
          description={t('albums.emptyDescription')}
          className="flex-1"
        />
      ) : (
        <CardGrid>
          {sortedAlbums.map((entry) => (
            <Card
              key={`${entry.ref.source.provider}-${entry.ref.source.id}`}
              title={entry.ref.title}
              subtitle={entry.ref.artists?.map((a) => a.name).join(', ')}
              src={pickArtwork(entry.ref.artwork, 'cover', 300)?.url}
            />
          ))}
        </CardGrid>
      )}
    </ViewShell>
  );
};
