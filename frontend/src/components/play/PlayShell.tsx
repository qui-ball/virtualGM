import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PlayShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Full-viewport wrapper for /campaign and /play on mobile.
 * Respects safe-area insets; children own internal scroll regions.
 */
export function PlayShell({ children, className }: PlayShellProps) {
  return (
    <div
      className={cn(
        'play-surface relative box-border flex h-full min-h-0 flex-1 flex-col overflow-hidden',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
