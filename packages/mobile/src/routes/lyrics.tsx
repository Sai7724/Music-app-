import { createFileRoute } from '@tanstack/react-router';

import { LyricsScreen } from '../screens/LyricsScreen';

export const Route = createFileRoute('/lyrics')({
  component: LyricsScreen,
});
