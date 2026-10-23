import { createFileRoute } from '@tanstack/react-router';

import { SearchScreen } from '../screens/SearchScreen';

export const Route = createFileRoute('/search')({
  component: SearchScreen,
});
