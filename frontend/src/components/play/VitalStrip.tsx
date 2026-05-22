import { forwardRef } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import { formatSignedModifier } from '@/lib/play/stats';
import { hpChipVariant } from '@/lib/play/vitalStrip';
import { StatChip } from '@/components/play/StatChip';
import { cn } from '@/lib/utils';

type VitalStripProps = {
  character: CharacterView;
  className?: string;
};

/**
 * Compact vital row for session (4 chips at 320px per wireframe).
 */
export const VitalStrip = forwardRef<HTMLDivElement, VitalStripProps>(
  function VitalStrip({ character, className }, ref) {
  const hpVar = hpChipVariant(character.hp, character.hpMax);
  const initSigned = formatSignedModifier(character.initiativeMod);

  const chips = [
    {
      key: 'hp',
      label: 'HP',
      value: `${character.hp}`,
      variant: hpVar,
      ariaLabel: `Hit points ${character.hp} of ${character.hpMax}`,
      displayValue: `${character.hp}/${character.hpMax}`,
    },
    {
      key: 'evasion',
      label: 'EVASION',
      value: `${character.evasion}`,
      variant: 'default' as const,
      ariaLabel: `Evasion ${character.evasion}`,
    },
    {
      key: 'initiative',
      label: 'INITIATIVE',
      value: initSigned,
      variant: 'default' as const,
      ariaLabel: `Initiative ${initSigned}`,
    },
    {
      key: 'conditions',
      label: 'CONDITIONS',
      value: '',
      variant: 'default' as const,
      ariaLabel: 'Conditions',
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
          value={chip.displayValue ?? chip.value}
          variant={chip.variant}
          ariaLabel={chip.ariaLabel}
          valueClassName="text-sm"
        />
      ))}
    </div>
  );
  },
);
