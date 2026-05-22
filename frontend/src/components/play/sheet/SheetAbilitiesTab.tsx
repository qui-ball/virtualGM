import type { SheetView } from '@/lib/play/sheetData';
import { GlancePill, SheetGlanceCard } from '@/components/play/sheet/SheetGlanceCard';

type SheetAbilitiesTabProps = {
  sheet: SheetView;
  classLabel: string;
};

export function SheetAbilitiesTab({ sheet, classLabel }: SheetAbilitiesTabProps) {
  const nextLocked = sheet.abilities.find((a) => a.locked);

  return (
    <div className="play-sheet-tab-panel space-y-2">
      <p className="play-lbl">Class abilities · {classLabel}</p>
      {sheet.abilities.map((a) => (
        <SheetGlanceCard
          key={a.id}
          title={a.name}
          disabled={a.locked}
          glance={
            <span className="play-mono text-[0.625rem] text-[var(--ink-3)]">
              Lv {a.requiredLevel}
              {a.locked && a.lockReason ? ` · ${a.lockReason}` : ''}
            </span>
          }
          pills={
            <GlancePill variant={a.locked ? 'danger' : 'tint'}>
              {a.locked ? 'Locked' : 'Active'}
            </GlancePill>
          }
          detail={<p className="text-sm leading-snug text-[var(--ink-2)]">{a.description}</p>}
        />
      ))}
      {nextLocked ? (
        <div className="play-rune-divider">
          <span>Next unlock at Lv {nextLocked.requiredLevel}</span>
        </div>
      ) : null}
    </div>
  );
}
