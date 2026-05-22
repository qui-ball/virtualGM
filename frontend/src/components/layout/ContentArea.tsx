import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Main content region inside the viewport shell.
 * Scroll happens here (or in nested play panes), not on the document.
 */
export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8',
        className
      )}
    >
      {children}
    </main>
  );
}
