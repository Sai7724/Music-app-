import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, Disc, ListMusic, MicVocal } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import {
  Button,
  FavoriteButton,
  PlayerBar,
  Slider,
  ViewShell,
} from '@nuclearplayer/ui';

import { useCoreSetting } from '../hooks/useCoreSetting';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';

export const FullPlayerScreen: FC = () => {
  const { t } = useTranslation('playerBar');
  const { t: tTrack } = useTranslation('track');
  const navigate = useNavigate();

  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const goToNext = useQueueStore((s) => s.goToNext);
  const goToPrevious = useQueueStore((s) => s.goToPrevious);
  const { status, toggle, seek, duration, seekTo } = useSoundStore();

  const [shuffle, setShuffle] = useCoreSetting<boolean>('playback.shuffle');
  const [repeat, setRepeat] = useCoreSetting<'off' | 'all' | 'one'>('playback.repeat');
  const [volume, setVolume] = useCoreSetting<number>('playback.volume');

  const isTrackFavorite = useFavoritesStore((s) => s.isTrackFavorite);
  const addTrack = useFavoritesStore((s) => s.addTrack);
  const removeTrack = useFavoritesStore((s) => s.removeTrack);

  const track = currentItem?.track;
  const isFavorite = track ? isTrackFavorite(track.source) : false;
  const artwork = track ? pickArtwork(track.artwork, 'cover', 600) : undefined;

  const safePosition = Number.isFinite(seek) ? seek : 0;
  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const progress = safeDuration > 0 ? (safePosition / safeDuration) * 100 : 0;
  const remaining = safeDuration - safePosition;

  const handleToggleFavorite = () => {
    if (!track) return;
    if (isFavorite) {
      void removeTrack(track.source);
    } else {
      addTrack(track);
    }
  };

  const handleToggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat ?? 'off');
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeat(modes[nextIndex]);
  };

  return (
    <ViewShell
      data-testid="full-player-view"
      title={track?.title ?? t('noTrackPlaying')}
    >
      <div className="flex justify-end items-center gap-2 mb-4 w-full max-w-md mx-auto">
        <Button
          size="icon"
          variant="text"
          onClick={() => void navigate({ to: '/lyrics' })}
          aria-label="Lyrics"
        >
          <MicVocal size={18} />
        </Button>
        <Button
          size="icon"
          variant="text"
          onClick={() => void navigate({ to: '/queue' })}
          aria-label="Queue"
        >
          <ListMusic size={18} />
        </Button>
        <Button
          size="icon"
          variant="text"
          onClick={() => void navigate({ to: '/dashboard' })}
          aria-label="Back"
        >
          <ChevronDown size={20} />
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full py-4 gap-6">
        <div className="relative aspect-square w-64 max-w-full rounded-2xl overflow-hidden border border-border bg-card shadow-2xl flex items-center justify-center">
          {artwork?.url ? (
            <img
              src={artwork.url}
              alt={track?.title ?? ''}
              className="size-full object-cover select-none"
            />
          ) : (
            <Disc size={96} className="opacity-20" />
          )}
        </div>

        <div className="flex items-center justify-between w-full px-4">
          <div className="flex flex-col min-w-0 pr-4">
            <h1 className="text-xl font-bold truncate">
              {track?.title ?? t('noTrackPlaying')}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {track?.artists?.map((a) => a.name).join(', ') ?? ''}
            </p>
          </div>
          {track && (
            <FavoriteButton
              size="default"
              isFavorite={isFavorite}
              onToggle={handleToggleFavorite}
              ariaLabelAdd={tTrack('actions.addToFavorites')}
              ariaLabelRemove={tTrack('actions.removeFromFavorites')}
            />
          )}
        </div>

        <div className="w-full px-4">
          <PlayerBar.SeekBar
            progress={progress}
            elapsedSeconds={safePosition}
            remainingSeconds={remaining}
            isLoading={currentItem?.status === 'loading'}
            onSeek={(pct) => {
              if (safeDuration > 0) seekTo((pct / 100) * safeDuration);
            }}
          />
        </div>

        <div className="flex items-center justify-center py-2">
          <PlayerBar.Controls
            isPlaying={status === 'playing'}
            isShuffleActive={Boolean(shuffle)}
            repeatMode={repeat ?? 'off'}
            onPlayPause={toggle}
            onNext={goToNext}
            onPrevious={goToPrevious}
            onShuffleToggle={() => setShuffle(!shuffle)}
            onRepeatToggle={handleToggleRepeat}
            showDiscovery={false}
            labels={{
              shuffleOn: t('shuffleOn'),
              shuffleOff: t('shuffleOff'),
              repeatOff: t('repeatOff'),
              repeatAll: t('repeatAll'),
              repeatOne: t('repeatOne'),
            }}
          />
        </div>

        <div className="flex items-center gap-4 w-full px-8 py-2">
          <Slider
            value={Math.round((volume ?? 1) * 100)}
            onValueChange={(val) => setVolume(val / 100)}
            className="flex-1"
          />
        </div>
      </div>
    </ViewShell>
  );
};
