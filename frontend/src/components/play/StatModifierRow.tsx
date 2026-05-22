import type { CharacterView } from '@/lib/play/characterView';
import { StatChip } from '@/components/play/StatChip';
import { cn } from '@/lib/utils';

type StatModifierRowProps = {
  character: CharacterView;
  className?: string;
};

/** Core stat modifiers — revealed with phase 2 sheet pull, above tabs. */
export function StatModifierRow({ character, className }: StatModifierRowProps) {
  return (
    <div
      className={cn('play-sheet-stat-row shrink-0', className)}
      aria-label="Ability modifiers"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {character.stats.map((s) => (
          <StatChip
            key={s.key}
            label={s.label}
            className="play-chip-stat-label"
            value={s.signed}
            variant={s.key === 'wit' && character.showMana ? 'hot' : 'default'}
            ariaLabel={s.ariaLabel}
          />
        ))}
      </div>
    </div>
  );
}
