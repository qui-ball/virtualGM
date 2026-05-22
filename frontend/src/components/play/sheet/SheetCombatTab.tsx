import type { SheetView } from '@/lib/play/sheetData';
import { StatChip } from '@/components/play/StatChip';
import {
  GlancePill,
  SheetGlanceCard,
} from '@/components/play/sheet/SheetGlanceCard';

type SheetCombatTabProps = {
  sheet: SheetView;
};

export function SheetCombatTab({ sheet }: SheetCombatTabProps) {
  return (
    <div className="play-sheet-tab-panel space-y-2">
      <p className="play-lbl">Saving throws (10 + stat)</p>
      <div className="grid grid-cols-4 gap-1.5">
        {sheet.saves.map((s) => (
          <StatChip
            key={s.label}
            label={s.label}
            value={String(s.value)}
            className="play-chip-stat-label"
            ariaLabel={`${s.label} save ${s.value}, stat ${s.modLabel}`}
          />
        ))}
      </div>

      <p className="play-lbl">Weapons</p>
      {sheet.weapons.map((w) => (
        <SheetGlanceCard
          key={w.name}
          title={w.name}
          glance={
            <span className="play-mono text-[0.625rem] text-[var(--ink-3)]">
              {w.dice}+{w.stat}
              {w.equipped ? ' · equipped' : ''}
            </span>
          }
          pills={<GlancePill>{w.stat}</GlancePill>}
          detail={
            <>
              <p className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {w.dice} + {w.stat} · {w.note}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-2)]">
                Attack — {w.attackLabel}. Rolls usually come from GM prompts in
                chat or the + menu free roll.
              </p>
            </>
          }
        />
      ))}

      <p className="play-lbl">Armor</p>
      <SheetGlanceCard
        title={sheet.armor.name}
        glance={
          <span className="play-mono text-[0.625rem] text-[var(--ink-3)]">
            {sheet.armor.type}
          </span>
        }
        pills={<GlancePill>{sheet.armor.type}</GlancePill>}
        detail={
          <>
            <p className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
              {sheet.armor.detail}
            </p>
            <p className="mt-2 text-sm text-[var(--ink-2)]">
              {sheet.armor.restriction}
            </p>
          </>
        }
      />
    </div>
  );
}
