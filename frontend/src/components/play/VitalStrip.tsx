import { forwardRef, useRef } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import { conditionIcon } from '@/lib/play/conditions';
import { useTheme } from '@/theme/useTheme';
import { formatSignedModifier } from '@/lib/play/stats';
import { hpChipVariant } from '@/lib/play/vitalStrip';
import { StatChip } from '@/components/play/StatChip';
import { cn } from '@/lib/utils';

type VitalStripProps = {
  character: CharacterView;
  onConditionsClick?: () => void;
  conditionsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  conditionsOpen?: boolean;
  className?: string;
};

/**
 * Compact vital row for session (4 chips at 320px per wireframe).
 */
export const VitalStrip = forwardRef<HTMLDivElement, VitalStripProps>(
  function VitalStrip(
    {
      character,
      onConditionsClick,
      conditionsButtonRef,
      conditionsOpen = false,
      className,
    },
    ref,
  ) {
    const { themeId } = useTheme();
    const fallbackBtnRef = useRef<HTMLButtonElement>(null);
    const btnRef = conditionsButtonRef ?? fallbackBtnRef;

    const hpVar = hpChipVariant(character.hp, character.hpMax);
    const initSigned = formatSignedModifier(character.initiativeMod);
    const activeConditions = character.conditions;
    const hasConditions = activeConditions.length > 0;

    const chips = [
      {
        key: 'hp',
        label: 'HP',
        variant: hpVar,
        ariaLabel: `Hit points ${character.hp} of ${character.hpMax}`,
        displayValue: `${character.hp}/${character.hpMax}`,
        interactive: false,
      },
      {
        key: 'evasion',
        label: 'EVASION',
        variant: 'default' as const,
        ariaLabel: `Evasion ${character.evasion}`,
        displayValue: `${character.evasion}`,
        interactive: false,
      },
      {
        key: 'initiative',
        label: 'INITIATIVE',
        variant: 'default' as const,
        ariaLabel: `Initiative ${initSigned}`,
        displayValue: initSigned,
        interactive: false,
      },
    ];

    return (
      <div
        ref={ref}
        className={cn(
          'grid shrink-0 grid-cols-4 gap-1.5 border-b border-[var(--panel-edge)] px-4 py-2',
          className,
        )}
        aria-label="Character vitals"
      >
        {chips.map((chip) => (
          <StatChip
            key={chip.key}
            label={chip.label}
            value={chip.displayValue}
            variant={chip.variant}
            ariaLabel={chip.ariaLabel}
            valueClassName="text-sm"
          />
        ))}

        <button
          ref={btnRef}
          type="button"
          className={cn(
            'min-h-[44px] rounded-[var(--r-sm)] border-0 bg-transparent p-0 text-left',
            conditionsOpen && 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-0)]',
          )}
          aria-label={
            hasConditions
              ? `Conditions: ${activeConditions.map((c) => c.label).join(', ')}. Show details.`
              : 'Conditions. None active.'
          }
          aria-expanded={conditionsOpen}
          aria-haspopup="dialog"
          onClick={onConditionsClick}
        >
          <StatChip
            label="CONDITIONS"
            value=""
            variant={hasConditions ? 'warn' : 'default'}
            className="h-full w-full"
            valueClassName="flex min-h-[1.25rem] items-center justify-center gap-0.5"
            valueSlot={
              hasConditions ? (
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {activeConditions.map((c) => (
                    <span
                      key={c.id}
                      className="play-condition-icon"
                      title={c.label}
                      aria-hidden
                    >
                      {conditionIcon(c.id, themeId)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-sm text-[var(--ink-3)]">—</span>
              )
            }
          />
        </button>
      </div>
    );
  },
);
