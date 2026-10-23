import { useQuery } from '@tanstack/react-query';
import { MicVocal } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { EmptyState, LyricsSkeleton, PlainLyrics, ViewShell } from '@nuclearplayer/ui';

import { useQueueStore } from '../stores/queueStore';

const fetchLyrics = async (
  title: string,
  artist: string,
): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { lyrics?: string };
    return data.lyrics ?? null;
  } catch {
    return null;
  }
};

export const LyricsScreen: FC = () => {
  const { t } = useTranslation('lyrics');
  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const track = currentItem?.track;

  const { data: lyrics, isFetching } = useQuery({
    queryKey: ['lyrics', track?.title, track?.artists?.[0]?.name],
    queryFn: () => fetchLyrics(track!.title, track!.artists?.[0]?.name ?? ''),
    enabled: Boolean(track?.title),
  });

  return (
    <ViewShell data-testid="lyrics-view" title={t('title')}>
      {!track && (
        <EmptyState
          icon={<MicVocal size={48} />}
          title={t('nothingPlaying')}
          description={t('nothingPlayingDescription')}
          className="flex-1"
        />
      )}

      {track && isFetching && (
        <LyricsSkeleton data-testid="lyrics-loading" />
      )}

      {track && !isFetching && !lyrics && (
        <EmptyState
          icon={<MicVocal size={48} />}
          title={t('notFound')}
          description={`${track.title} - ${track.artists?.[0]?.name ?? ''}`}
          className="flex-1"
        />
      )}

      {track && !isFetching && lyrics && (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto py-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold">{track.title}</h2>
            <p className="text-sm text-muted-foreground">
              {track.artists?.map((a) => a.name).join(', ')}
            </p>
          </div>
          <PlainLyrics
            sections={[
              {
                lines: lyrics
                  .split('\n')
                  .map((text) => ({ segments: [{ text }] })),
              },
            ]}
            className="text-base leading-loose"
          />
        </div>
      )}
    </ViewShell>
  );
};
