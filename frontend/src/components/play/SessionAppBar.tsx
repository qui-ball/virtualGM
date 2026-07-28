import { forwardRef } from 'react';
import type { SessionContextView } from '@/lib/play/sessionContext';
import { PlayIcon } from '@/components/play/PlayIcon';
import { cn } from '@/lib/utils';

type SessionAppBarProps = {
  context: SessionContextView;
  onMenuOpen: () => void;
  bossMode?: boolean;
  combatMode?: boolean;
  className?: string;
};

export const SessionAppBar = forwardRef<HTMLElement, SessionAppBarProps>(
  function SessionAppBar(
    { context, onMenuOpen, bossMode = false, combatMode = false, className },
    ref,
  ) {
    return (
      <header
        ref={ref}
        className={cn(
          'play-appbar play-appbar-session shrink-0',
          bossMode && 'play-appbar-boss',
          !bossMode && combatMode && 'play-appbar-combat',
          className,
        )}
        aria-label="Session"
      >
        <div className="play-appbar-center min-w-0">
          <p className="play-lbl text-[var(--accent)]">
            {context.campaignTitle} · Ch {context.chapter}
          </p>
          <h1 className="play-appbar-title truncate">{context.scene}</h1>
          <p className="play-appbar-sub">
            time {context.timeCurrent}/{context.timeMax}
            {bossMode ? ' · BOSS' : ''}
          </p>
        </div>
        <button
          type="button"
          className="play-iconbtn play-appbar-menu min-h-[44px] min-w-[44px]"
          aria-label="Open session menu"
          onClick={onMenuOpen}
        >
          <PlayIcon name="menu" />
        </button>
      </header>
    );
  },
);
