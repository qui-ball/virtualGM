import { cn } from '@/lib/utils';

export type VitalBarKind = 'hp' | 'mp' | 'xp';

type VitalBarProps = {
  value: number;
  max: number;
  kind?: VitalBarKind;
  className?: string;
  'aria-label'?: string;
};

export function VitalBar({
  value,
  max,
  kind = 'hp',
  className,
  'aria-label': ariaLabel,
}: VitalBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <div
      className={cn(
        'play-bar',
        kind === 'hp' && 'play-bar-hp',
        kind === 'mp' && 'play-bar-mp',
        kind === 'xp' && 'play-bar-xp',
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
