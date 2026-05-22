import { describe, expect, it } from 'vitest';
import { SHEET_TAB_LABELS } from '@/lib/play/sheetTabLabels';
import { sheetTabsFor } from '@/lib/play/sheetData';

describe('SHEET_TAB_LABELS (WS-6 tab bar)', () => {
  it('labels every tab id used by casters', () => {
    for (const tab of sheetTabsFor('mage')) {
      expect(SHEET_TAB_LABELS[tab]).toBeTruthy();
    }
  });

  it('labels every tab id used by non-casters', () => {
    for (const tab of sheetTabsFor('warrior')) {
      expect(SHEET_TAB_LABELS[tab]).toBeTruthy();
    }
  });

  it('uses Spells label (not a separate Magic tab)', () => {
    expect(SHEET_TAB_LABELS.spells).toBe('Spells');
    expect(sheetTabsFor('warrior')).not.toContain('spells');
  });

  it('does not expose a legacy Stats tab', () => {
    expect('stats' in SHEET_TAB_LABELS).toBe(false);
  });
});
