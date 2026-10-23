import { createFileRoute } from '@tanstack/react-router';

import { FavoriteTracksScreen } from '../../screens/FavoriteTracksScreen';

export const Route = createFileRoute('/favorites/tracks')({
  component: FavoriteTracksScreen,
});
