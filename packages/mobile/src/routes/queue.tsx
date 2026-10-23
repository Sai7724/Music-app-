import { createFileRoute } from '@tanstack/react-router';

import { QueueScreen } from '../screens/QueueScreen';

export const Route = createFileRoute('/queue')({
  component: QueueScreen,
});
