import { Trash2 } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, QueuePanel } from '@nuclearplayer/ui';

import { useQueueStore } from '../stores/queueStore';

type ConnectedQueuePanelProps = {
  isCollapsed?: boolean;
};

export const ConnectedQueuePanel: FC<ConnectedQueuePanelProps> = ({
  isCollapsed = false,
}) => {
  const { t } = useTranslation('queue');
  const items = useQueueStore((s) => s.items);
  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const goToId = useQueueStore((s) => s.goToId);
  const removeByIds = useQueueStore((s) => s.removeByIds);
  const reorder = useQueueStore((s) => s.reorder);

  return (
    <QueuePanel
      items={items}
      currentItemId={currentItem?.id}
      isCollapsed={isCollapsed}
      reorderable={!isCollapsed}
      onReorder={reorder}
      onSelectItem={goToId}
      onRemoveItem={(itemId) => removeByIds([itemId])}
      labels={{
        emptyTitle: t('empty.title'),
        emptySubtitle: t('empty.subtitle'),
        removeButton: t('actions.remove'),
        playbackError: t('errors.playback'),
        noCandidates: t('candidates.empty'),
        candidateFailed: t('candidates.failed'),
      }}
    />
  );
};

export const QueueHeaderActions: FC = () => {
  const { t } = useTranslation('queue');
  const items = useQueueStore((s) => s.items);
  const clearQueue = useQueueStore((s) => s.clearQueue);

  if (items.length === 0) return null;

  return (
    <Button
      size="icon"
      variant="text"
      onClick={clearQueue}
      aria-label={t('actions.clear')}
    >
      <Trash2 size={16} />
    </Button>
  );
};
