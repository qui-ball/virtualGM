import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Pill, type PillVariant } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type SheetGlanceCardProps = {
  title: string;
  glance: ReactNode;
  pills?: ReactNode;
  detail: ReactNode;
  disabled?: boolean;
  className?: string;
};

/** Compact sheet row; tap for detail popover. */
export function SheetGlanceCard({
  title,
  glance,
  pills,
  detail,
  disabled = false,
  className,
}: SheetGlanceCardProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const detailId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'play-glance-card-wrap',
        open && 'play-glance-card-wrap-open',
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          'play-glance-card w-full text-left',
          disabled && 'play-sheet-row-locked',
        )}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="play-glance-card-main">
          <span className="play-glance-card-title">{title}</span>
          <span className="play-glance-card-meta">{glance}</span>
        </span>
        {pills ? (
          <span className="play-glance-card-pills shrink-0">{pills}</span>
        ) : null}
        <span className="play-glance-card-chevron shrink-0" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <div
          id={detailId}
          className="play-glance-card-detail"
          aria-label={`${title} details`}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function GlancePill({
  children,
  variant = 'tint',
}: {
  children: ReactNode;
  variant?: PillVariant;
}) {
  return <Pill variant={variant}>{children}</Pill>;
}
