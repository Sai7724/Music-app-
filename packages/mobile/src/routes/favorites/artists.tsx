import { createFileRoute } from '@tanstack/react-router';

import { FavoriteArtistsScreen } from '../../screens/FavoriteArtistsScreen';

export const Route = createFileRoute('/favorites/artists')({
  component: FavoriteArtistsScreen,
});
