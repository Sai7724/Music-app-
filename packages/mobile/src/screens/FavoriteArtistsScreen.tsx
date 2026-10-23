import { Users } from 'lucide-react';
import { FC, useMemo } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Card, CardGrid, EmptyState, ViewShell } from '@nuclearplayer/ui';

import { useFavoritesStore } from '../stores/favoritesStore';

export const FavoriteArtistsScreen: FC = () => {
  const { t } = useTranslation('favorites');
  const artists = useFavoritesStore((s) => s.artists);

  const sortedArtists = useMemo(
    () =>
      [...artists].sort(
        (a, b) =>
          new Date(b.addedAtIso).getTime() - new Date(a.addedAtIso).getTime(),
      ),
    [artists],
  );

  return (
    <ViewShell data-testid="favorite-artists-view" title={t('artists.title')}>
      {sortedArtists.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title={t('artists.empty')}
          description={t('artists.emptyDescription')}
          className="flex-1"
        />
      ) : (
        <CardGrid>
          {sortedArtists.map((entry) => (
            <Card
              key={`${entry.ref.source.provider}-${entry.ref.source.id}`}
              title={entry.ref.name}
              src={pickArtwork(entry.ref.artwork, 'cover', 300)?.url}
            />
          ))}
        </CardGrid>
      )}
    </ViewShell>
  );
};
