import { createFileRoute } from '@tanstack/react-router';

import { HistoryScreen } from '../screens/HistoryScreen';

export const Route = createFileRoute('/history')({
  component: HistoryScreen,
});
