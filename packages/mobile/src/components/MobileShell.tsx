import {
  DiscIcon,
  GaugeIcon,
  HistoryIcon,
  ListMusicIcon,
  MicVocalIcon,
  MusicIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import { FC, useEffect, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  PlayerShell,
  RouteTransition,
  SidebarNavigation,
  SidebarNavigationItem,
  Toaster,
} from '@nuclearplayer/ui';

import { useQueueStore } from '../stores/queueStore';
import { ConnectedPlayerBar } from './ConnectedPlayerBar';
import { ConnectedQueuePanel, QueueHeaderActions } from './ConnectedQueuePanel';
import { ConnectedSettingsModal } from './ConnectedSettingsModal';
import { ConnectedTopBar } from './ConnectedTopBar';
import { MobileSoundProvider } from './MobileSoundProvider';
import { MobileStreamResolver } from './MobileStreamResolver';

type DrawerTab = 'nav' | 'queue';

export const MobileShell: FC = () => {
  const { t } = useTranslation('navigation');
  const { t: tPrefs } = useTranslation('preferences');

  const queueItems = useQueueStore((s) => s.items);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('nav');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Close drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openNav = () => {
    setDrawerTab('nav');
    setIsDrawerOpen(true);
  };

  const openQueue = () => {
    setDrawerTab('queue');
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <PlayerShell
      className="select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <MobileSoundProvider>
        <MobileStreamResolver />

        {/* Top bar — hamburger opens nav drawer, queue button opens queue drawer */}
        <ConnectedTopBar
          onToggleSidebar={openNav}
          onToggleQueue={openQueue}
          onOpenSettings={() => setIsSettingsOpen(true)}
          queueCount={queueItems.length}
        />

        {/* Main content — full width, safe area on sides */}
        <main
          className="surface-muted min-h-0 flex-1 overflow-auto"
          style={{
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          <RouteTransition />
        </main>

        {/* Bottom player bar */}
        <ConnectedPlayerBar
          onToggleQueue={openQueue}
          isQueueOpen={isDrawerOpen && drawerTab === 'queue'}
        />

        {/* ── Left drawer overlay ─────────────────────────────── */}
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={closeDrawer}
              aria-hidden="true"
            />

            {/* Drawer panel */}
            <div
              className="
                fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col
                surface-sidebar-left border-r border-border
                shadow-2xl
                animate-in slide-in-from-left duration-200
              "
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                paddingLeft: 'env(safe-area-inset-left)',
              }}
              role="dialog"
              aria-modal="true"
            >
              {/* Drawer tab switcher */}
              <div className="flex shrink-0 border-b border-border">
                <button
                  className={`
                    flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                    transition-colors
                    ${drawerTab === 'nav'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'}
                  `}
                  onClick={() => setDrawerTab('nav')}
                >
                  <GaugeIcon size={16} />
                  {t('navigation', { defaultValue: 'Navigation' })}
                </button>
                <button
                  className={`
                    flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                    transition-colors relative
                    ${drawerTab === 'queue'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'}
                  `}
                  onClick={() => setDrawerTab('queue')}
                >
                  <ListMusicIcon size={16} />
                  {t('queue', { defaultValue: 'Queue' })}
                  {queueItems.length > 0 && (
                    <span className="absolute top-2 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {queueItems.length > 99 ? '99+' : queueItems.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Nav tab */}
              {drawerTab === 'nav' && (
                <div className="flex flex-1 flex-col overflow-y-auto p-2">
                  <SidebarNavigation isCompact={false}>
                    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                      <SidebarNavigationItem
                        to="/dashboard"
                        icon={<GaugeIcon size={20} />}
                        label={t('dashboard')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/favorites/albums"
                        icon={<DiscIcon size={20} />}
                        label={t('favoriteAlbums')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/favorites/tracks"
                        icon={<MusicIcon size={20} />}
                        label={t('favoriteTracks')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/favorites/artists"
                        icon={<UserIcon size={20} />}
                        label={t('favoriteArtists')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/playlists"
                        icon={<ListMusicIcon size={20} />}
                        label={t('playlists')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/history"
                        icon={<HistoryIcon size={20} />}
                        label={t('history')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/lyrics"
                        icon={<MicVocalIcon size={20} />}
                        label={t('lyrics')}
                        onClick={closeDrawer}
                      />
                      <SidebarNavigationItem
                        to="/search"
                        icon={<SearchIcon size={20} />}
                        label={t('search')}
                        onClick={closeDrawer}
                      />
                    </div>
                    <SidebarNavigationItem
                      icon={<SettingsIcon size={20} />}
                      label={tPrefs('title')}
                      onClick={() => {
                        closeDrawer();
                        setIsSettingsOpen(true);
                      }}
                    />
                  </SidebarNavigation>
                </div>
              )}

              {/* Queue tab */}
              {drawerTab === 'queue' && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center justify-between px-4 py-2">
                    <span className="text-sm font-semibold text-foreground">
                      {t('queue', { defaultValue: 'Queue' })}
                    </span>
                    <QueueHeaderActions />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ConnectedQueuePanel isCollapsed={false} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <ConnectedSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <Toaster />
      </MobileSoundProvider>
    </PlayerShell>
  );
};
