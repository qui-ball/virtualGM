import type { CoinDisplay } from '@/lib/play/currency';
import type { SheetView } from '@/lib/play/sheetData';
import { CurrencyRow } from '@/components/play/sheet/CurrencyRow';
import { Pill } from '@/components/play/Pill';

type SheetInventoryTabProps = {
  sheet: SheetView;
  coins: CoinDisplay[];
};

export function SheetInventoryTab({ sheet, coins }: SheetInventoryTabProps) {
  return (
    <div className="play-sheet-tab-panel space-y-3">
      <div className="play-panel p-3">
        <p className="play-lbl mb-2">Currency</p>
        <CurrencyRow coins={coins} />
      </div>

      <div className="play-panel space-y-2 p-3">
        <p className="play-lbl">Active weapon</p>
        <p className="font-semibold text-[var(--ink)]">{sheet.activeWeapon}</p>
        <p className="play-mono text-[0.5625rem] text-[var(--ink-3)]">
          Switch gear in inventory when API supports loadout (WS-8).
        </p>
      </div>

      <p className="play-lbl">Carried</p>
      {sheet.inventory.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">No items listed.</p>
      ) : (
        sheet.inventory.map((item) => (
          <div key={item.name} className="play-panel px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">
                {item.name}
              </span>
              <Pill>×{item.qty}</Pill>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
