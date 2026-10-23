import { createFileRoute } from '@tanstack/react-router';

import { FavoriteAlbumsScreen } from '../../screens/FavoriteAlbumsScreen';

export const Route = createFileRoute('/favorites/albums')({
  component: FavoriteAlbumsScreen,
});
