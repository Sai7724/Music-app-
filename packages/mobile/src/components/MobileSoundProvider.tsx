/**
 * Mobile sound provider — wraps @nuclearplayer/hifi's Sound component.
 * Same logic as desktop SoundProvider, no Tauri dependencies.
 */
import { LoggerProvider, Sound, SoundError } from '@nuclearplayer/hifi';
import { useTranslation } from '@nuclearplayer/i18n';
import { FC, PropsWithChildren, useCallback, useEffect } from 'react';

import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';
import { eventBus } from '../services/eventBus';
import { useCoreSetting } from '../hooks/useCoreSetting';

const consoleLogger = {
  trace: (msg: string) => console.trace('[hifi]', msg),
  debug: (msg: string) => console.debug('[hifi]', msg),
  info: (msg: string) => console.info('[hifi]', msg),
  warn: (msg: string) => console.warn('[hifi]', msg),
  error: (msg: string) => console.error('[hifi]', msg),
};

export const MobileSoundProvider: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation('streaming');
  const { src, status, seek } = useSoundStore();
  const [crossfadeMs] = useCoreSetting<number>('playback.crossfadeMs');
  const [volume01] = useCoreSetting<number>('playback.volume');
  const [muted] = useCoreSetting<boolean>('playback.muted');
  const volumePercent = muted ? 0 : Math.round((volume01 ?? 1) * 100);

  useEffect(() => {
    LoggerProvider.init(consoleLogger);
  }, []);

  useEffect(() => {
    if (crossfadeMs !== undefined) {
      useSoundStore.getState().setCrossfadeMs(crossfadeMs);
    }
  }, [crossfadeMs]);

  const handleTimeUpdate = useCallback(
    ({ position, duration }: { position: number; duration: number }) => {
      useSoundStore.getState().updatePlayback(position, duration);
    },
    [],
  );

  const handleEnd = useCallback(() => {
    useQueueStore.getState().goToNext();
  }, []);

  const handleCanPlay = useCallback(() => {
    // Auto-play once the stream is ready, but only if not intentionally paused/stopped
    const { status } = useSoundStore.getState();
    if (status !== 'paused') {
      useSoundStore.getState().play();
    }
  }, []);

  const handleSourceInvalid = useCallback(() => {
    const track = useQueueStore.getState().getCurrentItem()?.track;
    if (track) eventBus.emit('streamSourceInvalid', track);
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      const message =
        error instanceof SoundError
          ? t(`errors.hifi.${error.code}`, { details: error.details })
          : error.message;
      console.error('[MobileSoundProvider] Playback error:', message);
    },
    [t],
  );

  return (
    <>
      {src && (
        <Sound
          src={src}
          status={status}
          seek={seek}
          volume={volumePercent}
          preload="auto"
          crossOrigin=""
          onTimeUpdate={handleTimeUpdate}
          onEnd={handleEnd}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onSourceInvalid={handleSourceInvalid}
        />
      )}
      {children}
    </>
  );
};
