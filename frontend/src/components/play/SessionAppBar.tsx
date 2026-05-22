import { forwardRef } from 'react';
import type { SessionContextView } from '@/lib/play/sessionContext';
import { PlayIcon } from '@/components/play/PlayIcon';
import { cn } from '@/lib/utils';

type SessionAppBarProps = {
  context: SessionContextView;
  onMenuOpen: () => void;
  className?: string;
};

export const SessionAppBar = forwardRef<HTMLElement, SessionAppBarProps>(
  function SessionAppBar({ context, onMenuOpen, className }, ref) {
    return (
      <header
        ref={ref}
        className={cn('play-appbar shrink-0', className)}
        aria-label="Session"
      >
        <div className="min-w-0 flex-1">
          <p className="play-lbl text-[var(--accent)]">
            {context.campaignTitle} · Ch {context.chapter}
          </p>
          <h1 className="play-appbar-title truncate">{context.scene}</h1>
          <p className="play-appbar-sub">
            time {context.timeCurrent}/{context.timeMax}
          </p>
        </div>
        <button
          type="button"
          className="play-iconbtn min-h-[44px] min-w-[44px]"
          aria-label="Open session menu"
          onClick={onMenuOpen}
        >
          <PlayIcon name="menu" />
        </button>
      </header>
    );
  },
);
