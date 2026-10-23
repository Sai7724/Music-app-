import { createFileRoute } from '@tanstack/react-router';

import { FullPlayerScreen } from '../screens/FullPlayerScreen';

export const Route = createFileRoute('/player')({
  component: FullPlayerScreen,
});
