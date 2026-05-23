import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatChipVariant = 'default' | 'hot' | 'warn' | 'bad';

type StatChipProps = {
  label: string;
  value: string;
  variant?: StatChipVariant;
  ariaLabel?: string;
  valueClassName?: string;
  /** Replaces default value text (e.g. condition icon row). */
  valueSlot?: ReactNode;
  className?: string;
};

export function StatChip({
  label,
  value,
  variant = 'default',
  ariaLabel,
  valueClassName,
  valueSlot,
  className,
}: StatChipProps) {
  const uid = useId();
  const valueId = `${uid}-value`;
  const labelId = `${uid}-label`;

  return (
    <div
      className={cn(
        'play-chip',
        variant === 'hot' && 'play-chip-hot',
        variant === 'warn' && 'play-chip-warn',
        variant === 'bad' && 'play-chip-bad',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : `${valueId} ${labelId}`}
    >
      <span id={valueId} className={cn('play-chip-value', valueClassName)}>
        {valueSlot ?? value}
      </span>
      <span id={labelId} className="play-chip-key">
        {label}
      </span>
    </div>
  );
}
