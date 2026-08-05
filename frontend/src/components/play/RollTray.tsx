import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { formatDiceExpression } from '@/lib/play/dice';
import { cn } from '@/lib/utils';
import type { DiceType } from '@/types';

const FREE_ROLL_DIE_TYPES: DiceType[] = [
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
  'd20',
];

const MIN_DICE = 1;
const MAX_DICE = 10;

export type FreeRollTrayConfig = {
  label: string;
  modifier: number;
  vs?: number | null;
  diceType?: DiceType;
  diceCount?: number;
};

type RollTrayProps = {
  open: boolean;
  config: FreeRollTrayConfig | null;
  rolling?: boolean;
  onRoll: (config: FreeRollTrayConfig) => void;
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

  const [diceType, setDiceType] = useState<DiceType>('d20');
  const [diceCount, setDiceCount] = useState(1);

  useEffect(() => {
    if (!open || !config) return;
    setDiceType(config.diceType ?? 'd20');
    setDiceCount(Math.max(MIN_DICE, Math.min(MAX_DICE, config.diceCount ?? 1)));
  }, [open, config]);

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
  const expression = formatDiceExpression(diceCount, diceType);

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

        <div className="mt-3">
          <p className="play-lbl mb-1.5">Die type</p>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Die type"
          >
            {FREE_ROLL_DIE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={cn(
                  'play-pill min-h-[36px] cursor-pointer px-2.5',
                  diceType === type ? 'play-pill-solid' : 'play-pill-tint',
                )}
                aria-pressed={diceType === type}
                disabled={rolling}
                onClick={() => setDiceType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="play-lbl">Number of dice</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="play-iconbtn min-h-[40px] min-w-[40px]"
              aria-label="Fewer dice"
              disabled={rolling || diceCount <= MIN_DICE}
              onClick={() => setDiceCount((n) => Math.max(MIN_DICE, n - 1))}
            >
              −
            </button>
            <span className="min-w-[2ch] text-center text-lg font-semibold tabular-nums">
              {diceCount}
            </span>
            <button
              type="button"
              className="play-iconbtn min-h-[40px] min-w-[40px]"
              aria-label="More dice"
              disabled={rolling || diceCount >= MAX_DICE}
              onClick={() => setDiceCount((n) => Math.min(MAX_DICE, n + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 py-3">
          <Pill variant="tint">{expression}</Pill>
          {config.modifier !== 0 ? <Pill>{modStr} mod</Pill> : null}
          {config.vs != null ? <Pill>vs {config.vs}</Pill> : null}
        </div>

        <button
          type="button"
          className={cn('play-btn-primary w-full min-h-[44px]')}
          onClick={() =>
            onRoll({
              ...config,
              diceType,
              diceCount,
            })
          }
          disabled={rolling}
        >
          <PlayIcon name="bolt" className="size-[18px]" />
          {rolling ? 'Rolling…' : `Roll ${expression}`}
        </button>
        <p className="play-lbl mt-2 text-center text-[var(--ink-4)]">
          escape hatch — most rolls flow from GM prompts
        </p>
      </div>
    </>
  );
}
