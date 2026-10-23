import { useNavigate } from '@tanstack/react-router';
import {
  Disc,
  History,
  ListMusic,
  Music,
  Search,
  User,
} from 'lucide-react';
import { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';

import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';

// ── Small quick-access tile (3-column grid) ──────────────────────────────────
const QuickTile: FC<{
  icon: ReactNode;
  label: string;
  subtitle?: string;
  onClick: () => void;
}> = ({ icon, label, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className="
      surface-sidebar-left flex flex-col items-center justify-center gap-2
      rounded-xl border border-border p-4 text-center
      active:scale-95 transition-transform
      min-h-[88px]
    "
  >
    <span className="text-primary">{icon}</span>
    <span className="text-xs font-semibold leading-tight truncate w-full text-center">
      {label}
    </span>
    {subtitle && (
      <span className="text-[10px] text-muted-foreground leading-none">
        {subtitle}
      </span>
    )}
  </button>
);

// ── Horizontal scroll card (album / queue row) ────────────────────────────────
const HScrollCard: FC<{
  title: string;
  subtitle?: string;
  src?: string;
  onClick: () => void;
}> = ({ title, subtitle, src, onClick }) => (
  <button
    onClick={onClick}
    className="
      flex w-28 shrink-0 flex-col gap-1.5
      active:opacity-70 transition-opacity text-left
    "
  >
    <div className="aspect-square w-full rounded-lg overflow-hidden bg-card border border-border">
      {src ? (
        <img src={src} alt={title} className="size-full object-cover" />
      ) : (
        <div className="size-full flex items-center justify-center opacity-20">
          <Music size={32} />
        </div>
      )}
    </div>
    <p className="text-xs font-medium leading-tight line-clamp-2">{title}</p>
    {subtitle && (
      <p className="text-[10px] text-muted-foreground leading-none truncate">
        {subtitle}
      </p>
    )}
  </button>
);

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader: FC<{ title: string }> = ({ title }) => (
  <h2 className="text-base font-bold text-foreground mb-3">{title}</h2>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export const DashboardScreen: FC = () => {
  const { t } = useTranslation('navigation');
  const navigate = useNavigate();

  const tracks = useFavoritesStore((s) => s.tracks);
  const albums = useFavoritesStore((s) => s.albums);
  const artists = useFavoritesStore((s) => s.artists);
  const queueItems = useQueueStore((s) => s.items);

  const quickLinks = [
    {
      title: t('search'),
      icon: <Search size={24} />,
      to: '/search',
    },
    {
      title: t('favoriteTracks'),
      subtitle: tracks.length > 0 ? `${tracks.length}` : undefined,
      icon: <Music size={24} />,
      to: '/favorites/tracks',
    },
    {
      title: t('favoriteAlbums'),
      subtitle: albums.length > 0 ? `${albums.length}` : undefined,
      icon: <Disc size={24} />,
      to: '/favorites/albums',
    },
    {
      title: t('favoriteArtists'),
      subtitle: artists.length > 0 ? `${artists.length}` : undefined,
      icon: <User size={24} />,
      to: '/favorites/artists',
    },
    {
      title: t('playlists'),
      icon: <ListMusic size={24} />,
      to: '/playlists',
    },
    {
      title: t('history'),
      icon: <History size={24} />,
      to: '/history',
    },
  ];

  return (
    // Native scroll — no custom scrollbar overlay, full-width content
    <div
      data-testid="dashboard-view"
      className="flex flex-col gap-6 px-4 py-5 overflow-y-auto h-full"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {/* Page title */}
      <h1 className="text-2xl font-bold text-foreground">{t('dashboard')}</h1>

      {/* Quick access — 3-column icon grid */}
      <section>
        <SectionHeader title={t('quickAccess')} />
        <div className="grid grid-cols-3 gap-3">
          {quickLinks.map((item) => (
            <QuickTile
              key={item.to}
              icon={item.icon}
              label={item.title}
              subtitle={item.subtitle}
              onClick={() => void navigate({ to: item.to })}
            />
          ))}
        </div>
      </section>

      {/* Favorite albums — horizontal scroll row */}
      {albums.length > 0 && (
        <section>
          <SectionHeader title={t('favoriteAlbums')} />
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {albums.slice(0, 12).map((entry) => (
              <HScrollCard
                key={`${entry.ref.source.provider}-${entry.ref.source.id}`}
                title={entry.ref.title}
                subtitle={entry.ref.artists?.map((a) => a.name).join(', ')}
                src={pickArtwork(entry.ref.artwork, 'cover', 300)?.url}
                onClick={() => void navigate({ to: '/favorites/albums' })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Favorite artists — horizontal scroll row */}
      {artists.length > 0 && (
        <section>
          <SectionHeader title={t('favoriteArtists')} />
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {artists.slice(0, 12).map((entry) => (
              <HScrollCard
                key={`${entry.ref.source.provider}-${entry.ref.source.id}`}
                title={entry.ref.name}
                src={pickArtwork(entry.ref.artwork, 'cover', 300)?.url}
                onClick={() => void navigate({ to: '/favorites/artists' })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Current queue — horizontal scroll row */}
      {queueItems.length > 0 && (
        <section>
          <SectionHeader title={t('queue')} />
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {queueItems.slice(0, 12).map((item, idx) => (
              <HScrollCard
                key={item.id}
                title={item.track.title}
                subtitle={item.track.artists?.map((a) => a.name).join(', ')}
                src={pickArtwork(item.track.artwork, 'cover', 300)?.url}
                onClick={() => useQueueStore.getState().goToIndex(idx)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Bottom padding so last item clears the player bar */}
      <div className="h-4" />
    </div>
  );
};
