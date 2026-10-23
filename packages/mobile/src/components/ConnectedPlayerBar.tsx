import { ListMusic } from 'lucide-react';
import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Button, FavoriteButton, PlayerBar } from '@nuclearplayer/ui';

import { useCoreSetting } from '../hooks/useCoreSetting';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';

type ConnectedPlayerBarProps = {
  onToggleQueue?: () => void;
  isQueueOpen?: boolean;
};

export const ConnectedPlayerBar: FC<ConnectedPlayerBarProps> = ({
  onToggleQueue,
  isQueueOpen = false,
}) => {
  const { t } = useTranslation('playerBar');
  const { t: tTrack } = useTranslation('track');

  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const goToNext = useQueueStore((s) => s.goToNext);
  const goToPrevious = useQueueStore((s) => s.goToPrevious);

  const { status, toggle, seek, duration, seekTo } = useSoundStore(
    useShallow((s) => ({
      status: s.status,
      toggle: s.toggle,
      seek: s.seek,
      duration: s.duration,
      seekTo: s.seekTo,
    })),
  );

  const isTrackFavorite = useFavoritesStore((s) => s.isTrackFavorite);
  const addTrack = useFavoritesStore((s) => s.addTrack);
  const removeTrack = useFavoritesStore((s) => s.removeTrack);

  const [shuffle, setShuffle] = useCoreSetting<boolean>('playback.shuffle');
  const [repeat, setRepeat] = useCoreSetting<'off' | 'all' | 'one'>('playback.repeat');
  const [volume, setVolume] = useCoreSetting<number>('playback.volume');

  const track = currentItem?.track;
  const isFavorite = track ? isTrackFavorite(track.source) : false;

  const artwork = track ? pickArtwork(track.artwork, 'thumbnail', 64) : undefined;
  const title = track?.title ?? t('noTrackPlaying');
  const artist = track?.artists?.[0]?.name ?? '';

  const safePosition = Number.isFinite(seek) ? seek : 0;
  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const progress = safeDuration > 0 ? (safePosition / safeDuration) * 100 : 0;
  const remaining = safeDuration - safePosition;

  const handleSeek = (percent: number) => {
    if (safeDuration > 0) {
      seekTo((percent / 100) * safeDuration);
    }
  };

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
    <div
      className="surface-playerbar relative border-t-(length:--border-width) border-border"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <PlayerBar.SeekBar
        progress={progress}
        elapsedSeconds={safePosition}
        remainingSeconds={remaining}
        isLoading={currentItem?.status === 'loading'}
        onSeek={handleSeek}
      />
      <PlayerBar
        className="px-2 sm:px-4"
        left={
          <PlayerBar.NowPlaying
            title={title}
            artist={artist}
            coverUrl={artwork?.url}
            action={
              track && (
                <FavoriteButton
                  size="sm"
                  isFavorite={isFavorite}
                  onToggle={handleToggleFavorite}
                  ariaLabelAdd={tTrack('actions.addToFavorites')}
                  ariaLabelRemove={tTrack('actions.removeFromFavorites')}
                />
              )
            }
          />
        }
        center={
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
        }
        right={
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <PlayerBar.Volume
                value={Math.round((volume ?? 1) * 100)}
                onValueChange={(val) => setVolume(val / 100)}
              />
            </div>
            <Button
              size="icon"
              variant={isQueueOpen ? 'secondary' : 'text'}
              onClick={onToggleQueue}
              aria-label="Queue"
            >
              <ListMusic size={18} />
            </Button>
          </div>
        }
      />
    </div>
  );
};
