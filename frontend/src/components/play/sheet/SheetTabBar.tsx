import { SHEET_TAB_LABELS } from '@/lib/play/sheetTabLabels';
import type { SheetTabId } from '@/lib/play/sheetData';
import { cn } from '@/lib/utils';

type SheetTabBarProps = {
  tabs: SheetTabId[];
  active: SheetTabId;
  onChange: (tab: SheetTabId) => void;
};

export function SheetTabBar({ tabs, active, onChange }: SheetTabBarProps) {
  return (
    <div
      className="play-sheet-tabs shrink-0"
      role="tablist"
      aria-label="Character sheet sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          className={cn('play-sheet-tab', active === tab && 'play-sheet-tab-on')}
          onClick={() => onChange(tab)}
        >
          {SHEET_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
