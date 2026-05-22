import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

export type FreeRollTrayConfig = {
  label: string;
  modifier: number;
  vs?: number | null;
};

type RollTrayProps = {
  open: boolean;
  config: FreeRollTrayConfig | null;
  rolling?: boolean;
  onRoll: () => void;
  onClose: () => void;
};

export function RollTray({
  open,
  config,
  rolling = false,
  onRoll,
  onClose,
}: RollTrayProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !config) return null;

  const modStr =
    config.modifier >= 0 ? `+${config.modifier}` : `${config.modifier}`;

  return (
    <>
      <button
        type="button"
        className="play-sheet-backdrop"
        aria-label="Close roll tray"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="play-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Free roll"
      >
        <div className="play-bottom-sheet-handle" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="play-lbl">Free roll</p>
            <h2 className="play-h-display text-xl">{config.label}</h2>
          </div>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Close"
            onClick={onClose}
          >
            <PlayIcon name="close" />
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 py-3">
          <Pill variant="tint">d20</Pill>
          <Pill>{modStr} mod</Pill>
          {config.vs != null ? <Pill>vs {config.vs}</Pill> : null}
        </div>
        <button
          type="button"
          className={cn('play-btn-primary w-full min-h-[44px]')}
          onClick={onRoll}
          disabled={rolling}
        >
          <PlayIcon name="bolt" className="size-[18px]" />
          Roll d20
        </button>
        <p className="play-lbl mt-2 text-center text-[var(--ink-4)]">
          escape hatch — most rolls flow from GM prompts
        </p>
      </div>
    </>
  );
}
