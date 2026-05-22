import { useState } from 'react';
import type { SpellTierName } from '@/lib/play/sheetCatalog';
import type { SheetView } from '@/lib/play/sheetData';
import { spellsForTier } from '@/lib/play/sheetData';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type SheetSpellsTabProps = {
  sheet: SheetView;
};

const TIER_OPTIONS: { id: SpellTierName; label: string }[] = [
  { id: 'Minor', label: 'Minor 1' },
  { id: 'Major', label: 'Major 2' },
  { id: 'Mythic', label: 'Mythic 3' },
];

export function SheetSpellsTab({ sheet }: SheetSpellsTabProps) {
  const [tier, setTier] = useState<SpellTierName>('Minor');
  const tierSpells = spellsForTier(sheet.spells, tier);

  return (
    <div className="play-sheet-tab-panel space-y-3">
      <div className="play-panel play-panel-glow space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="play-lbl">Mana</span>
          {sheet.manaFormula ? (
            <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
              {sheet.manaFormula}
            </span>
          ) : null}
        </div>
        <div className="play-mp-pips" aria-label={`Mana ${sheet.manaCurrent} of ${sheet.manaMax}`}>
          {Array.from({ length: Math.max(sheet.manaMax, 1) }).map((_, i) => (
            <span
              key={i}
              className={cn('play-mp-pip', i < sheet.manaCurrent && 'play-mp-pip-on')}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <SegmentedControl
        options={TIER_OPTIONS}
        value={tier}
        onChange={setTier}
        aria-label="Spell tier"
      />

      {tierSpells.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">No spells in this tier.</p>
      ) : (
        tierSpells.map((s) => (
          <div
            key={s.id}
            className={cn('play-panel space-y-2 p-3', s.locked && 'play-sheet-row-locked')}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[var(--ink)]">{s.name}</span>
              {s.locked ? (
                <Pill variant="danger">{s.lockReason ?? 'Locked'}</Pill>
              ) : (
                <Pill variant="solid">{s.cost} MP</Pill>
              )}
            </div>
            <p className="text-sm leading-snug text-[var(--ink-2)]">{s.description}</p>
            {!s.locked ? (
              <p className="play-mono text-[0.5625rem] text-[var(--ink-4)]">
                Cast from + menu or GM prompt
              </p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
