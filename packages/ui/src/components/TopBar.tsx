import { CSSProperties, FC, ReactNode } from 'react';

import { cn } from '../utils';

export type TopBarProps = {
  children?: ReactNode;
  className?: string;
  draggable?: boolean;
  style?: CSSProperties;
};

export const TopBar: FC<TopBarProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <header
      className={cn(
        'surface-topbar border-border grid h-12 grid-cols-[1fr_4fr_1fr] items-center gap-2 border-b-(length:--border-width) px-3 select-none',
        className,
      )}
      style={style}
      data-tauri-drag-region
    >
      {children}
    </header>
  );
};
