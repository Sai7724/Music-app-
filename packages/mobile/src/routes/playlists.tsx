import { createFileRoute } from '@tanstack/react-router';

import { PlaylistsScreen } from '../screens/PlaylistsScreen';

export const Route = createFileRoute('/playlists')({
  component: PlaylistsScreen,
});
