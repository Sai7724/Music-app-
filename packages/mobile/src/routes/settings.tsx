/**
 * /settings redirects to /dashboard and opens the settings modal.
 * The settings modal is managed by MobileShell (same pattern as the desktop).
 * We use a redirect so any link to /settings still works gracefully.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
  component: () => null,
});
