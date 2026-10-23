import { ListMusic, Plus } from 'lucide-react';
import { FC, useState } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  Button,
  Card,
  CardGrid,
  Dialog,
  EmptyState,
  Input,
  ViewShell,
} from '@nuclearplayer/ui';

import { useMobilePlaylists } from '../hooks/useMobilePlaylists';

export const PlaylistsScreen: FC = () => {
  const { t } = useTranslation('playlists');
  const { index, createPlaylist } = useMobilePlaylists();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const handleCreate = async () => {
    if (!playlistName.trim()) return;
    await createPlaylist(playlistName.trim());
    setPlaylistName('');
    setIsDialogOpen(false);
    toast.success(t('created'));
  };

  return (
    <ViewShell data-testid="playlists-view" title={t('title')}>
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus size={16} />
          <span>{t('create')}</span>
        </Button>
      </div>
      {index.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={48} />}
          title={t('empty')}
          description={t('emptyDescription')}
          className="flex-1"
        />
      ) : (
        <CardGrid>
          {index.map((entry) => (
            <Card
              key={entry.id}
              title={entry.name}
              subtitle={t('tracksCount', { count: entry.trackCount ?? 0 })}
            />
          ))}
        </CardGrid>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={t('create')}
        description={t('namePlaceholder')}
        actions={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()}>
              {t('create')}
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <Input
            autoFocus
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            placeholder={t('namePlaceholder')}
          />
        </div>
      </Dialog>
    </ViewShell>
  );
};
