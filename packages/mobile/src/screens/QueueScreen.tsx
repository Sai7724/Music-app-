import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { ViewShell } from '@nuclearplayer/ui';

import {
  ConnectedQueuePanel,
  QueueHeaderActions,
} from '../components/ConnectedQueuePanel';

export const QueueScreen: FC = () => {
  const { t } = useTranslation('queue');

  return (
    <ViewShell data-testid="queue-view" title={t('title')}>
      <div className="flex justify-end mb-2">
        <QueueHeaderActions />
      </div>
      <div className="flex-1 overflow-hidden">
        <ConnectedQueuePanel isCollapsed={false} />
      </div>
    </ViewShell>
  );
};
