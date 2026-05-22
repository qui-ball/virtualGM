import { cn } from '@/lib/utils';

export type StatChipVariant = 'default' | 'hot' | 'warn' | 'bad';

type StatChipProps = {
  label: string;
  value: string;
  variant?: StatChipVariant;
  ariaLabel?: string;
  valueClassName?: string;
  className?: string;
};

export function StatChip({
  label,
  value,
  variant = 'default',
  ariaLabel,
  valueClassName,
  className,
}: StatChipProps) {
  return (
    <div
      className={cn(
        'play-chip',
        variant === 'hot' && 'play-chip-hot',
        variant === 'warn' && 'play-chip-warn',
        variant === 'bad' && 'play-chip-bad',
        className,
      )}
      aria-label={ariaLabel ?? `${label} ${value}`}
    >
      <span className={cn('play-chip-value', valueClassName)}>{value}</span>
      <span className="play-chip-key">{label}</span>
    </div>
  );
}
