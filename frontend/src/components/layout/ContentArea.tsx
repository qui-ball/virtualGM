import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Main content container with consistent padding and scroll handling.
 * Use as the primary scrollable area inside the app layout.
 */
export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <main
      className={cn(
        'min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8',
        className
      )}
    >
      {children}
    </main>
  );
}
