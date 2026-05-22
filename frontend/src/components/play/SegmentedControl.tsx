import { cn } from '@/lib/utils';

export type SegmentOption<T extends string> = {
  id: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
  'aria-label'?: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn('play-seg', className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={cn('play-seg-btn', value === opt.id && 'play-seg-btn-on')}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
