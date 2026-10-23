import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { ListMusic, PanelLeft, Search, Settings, X } from 'lucide-react';
import { FC, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  Button,
  Input,
  ThemeController,
  Tooltip,
  TopBar,
  TopBarLogo,
  TopBarNavigation,
} from '@nuclearplayer/ui';

import { useCoreSetting } from '../hooks/useCoreSetting';

type ConnectedTopBarProps = {
  onToggleSidebar?: () => void;
  onToggleQueue?: () => void;
  onOpenSettings?: () => void;
  queueCount?: number;
};

export const ConnectedTopBar: FC<ConnectedTopBarProps> = ({
  onToggleSidebar,
  onToggleQueue,
  onOpenSettings,
  queueCount = 0,
}) => {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { t } = useTranslation('search');
  const [query, setQuery] = useState('');
  const [isDark, setIsDark] = useCoreSetting<boolean>('theme.dark');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      void router.navigate({
        to: '/search',
        search: { q: query.trim() },
      });
    }
  };

  return (
    <TopBar
      className="flex items-center justify-between gap-2 px-3"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
        height: 'calc(48px + env(safe-area-inset-top))',
      }}
    >
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="text"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          className="shrink-0"
        >
          <PanelLeft size={18} />
        </Button>
        <Tooltip content="Nuclear" side="bottom" wrapperClassName="flex items-center">
          <button
            type="button"
            onClick={() => void router.navigate({ to: '/dashboard' })}
            className="flex items-center cursor-pointer"
          >
            <TopBarLogo />
          </button>
        </Tooltip>
        <div className="hidden sm:flex items-center">
          <TopBarNavigation
            onBack={() => router.history.back()}
            onForward={() => router.history.forward()}
            canGoBack={canGoBack}
            canGoForward={false}
          />
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="relative flex-1 max-w-md mx-2"
      >
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('placeholder')}
          tone="secondary"
          className="h-8 w-full pl-8 pr-8 text-xs"
        />
        {query.length > 0 && (
          <Button
            size="icon"
            variant="text"
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-1 size-6 -translate-y-1/2 justify-center p-0"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </form>

      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeController
          isDark={isDark ?? true}
          onThemeChange={setIsDark}
        />
        <Button
          size="icon"
          variant="text"
          onClick={onToggleQueue}
          aria-label="Queue"
          className="relative"
        >
          <ListMusic size={18} />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {queueCount > 99 ? '99+' : queueCount}
            </span>
          )}
        </Button>
        <Button
          size="icon"
          variant="text"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          <Settings size={18} />
        </Button>
      </div>
    </TopBar>
  );
};
