import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import { buildSheetView } from '@/lib/play/sheetData';
import {
  canAffordCast,
  castTierOptions,
  castableSpellsForTier,
  defaultCastTier,
} from '@/lib/play/castFlow';

describe('castFlow (WS-7.4)', () => {
  it('defaults to max unlocked tier for mage', () => {
    expect(defaultCastTier(DEMO_CHARACTER)).toBe('Major');
  });

  it('locks mythic tier for low-level mage', () => {
    const opts = castTierOptions({ ...DEMO_CHARACTER, level: 4 });
    const mythic = opts.find((o) => o.id === 'Mythic');
    expect(mythic?.locked).toBe(true);
    expect(mythic?.lockReason).toMatch(/Lv 6/);
  });

  it('lists only known unlocked spells per tier', () => {
    const sheet = buildSheetView(DEMO_CHARACTER);
    const minor = castableSpellsForTier(sheet, 'Minor');
    expect(minor.every((s) => s.known && !s.locked)).toBe(true);
    expect(minor.length).toBeGreaterThan(0);
  });

  it('checks mana for cast affordance', () => {
    expect(canAffordCast(6, 2)).toBe(true);
    expect(canAffordCast(1, 2)).toBe(false);
  });
});
