import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PillVariant = 'default' | 'solid' | 'tint' | 'danger';

type PillProps = {
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
};

export function Pill({ children, variant = 'default', className }: PillProps) {
  return (
    <span
      className={cn(
        'play-pill',
        variant === 'solid' && 'play-pill-solid',
        variant === 'tint' && 'play-pill-tint',
        variant === 'danger' && 'play-pill-danger',
        className,
      )}
    >
      {children}
    </span>
  );
}
