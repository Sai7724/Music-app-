import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { FC } from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@nuclearplayer/i18n';
// PlatformProvider only knows macos/windows/linux — we pass linux as fallback
// since mobile uses its own layout and doesn't rely on platform-specific UI
import { PlatformProvider } from '@nuclearplayer/ui';

import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const MobileApp: FC = () => {
  return (
    // linux is a safe fallback — mobile doesn't use platform-specific desktop chrome
    <PlatformProvider platform="linux">
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </I18nextProvider>
    </PlatformProvider>
  );
};
