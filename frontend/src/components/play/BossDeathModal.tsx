import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';

type BossDeathModalProps = {
  open: boolean;
  characterName: string;
  onBlazeOfGlory: () => void;
  onRiskItAll: () => void;
};

export function BossDeathModal({
  open,
  characterName,
  onBlazeOfGlory,
  onRiskItAll,
}: BossDeathModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  if (!open) return null;

  return (
    <div
      className="play-boss-zero-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-zero-title"
    >
      <div ref={dialogRef} className="play-boss-zero-panel">
        <div className="flex items-center justify-between gap-2">
          <span className="play-lbl">Boss · zero state</span>
          <span className="play-mono text-[0.5625rem] text-[var(--ink-3)]">
            non-boss → auto-recover
          </span>
        </div>
        <h2 id="boss-zero-title" className="play-h-display mt-1 text-lg">
          {characterName} is down. Choose:
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            className={cn(
              'play-boss-zero-opt play-boss-zero-opt-primary min-h-[48px]',
            )}
            onClick={onBlazeOfGlory}
          >
            <span className="font-semibold">⚔ Blaze of Glory</span>
            <span className="play-mono mt-0.5 block text-[0.5625rem] font-normal text-[var(--ink-3)]">
              Auto-crit single action · then die
            </span>
          </button>
          <button
            type="button"
            className="play-boss-zero-opt min-h-[48px]"
            onClick={onRiskItAll}
          >
            <span className="font-semibold">⌖ Risk It All</span>
            <span className="play-mono mt-0.5 block text-[0.5625rem] font-normal text-[var(--ink-3)]">
              Roll d20 · nat 20 → 5 HP, continue · else die
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
