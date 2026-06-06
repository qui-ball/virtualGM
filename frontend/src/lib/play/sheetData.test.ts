import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import {
  buildSheetView,
  maxUnlockedSpellTier,
  sheetTabsFor,
  spellsForTier,
} from '@/lib/play/sheetData';

describe('sheetData', () => {
  it('includes Spells tab for casters only', () => {
    expect(sheetTabsFor('mage')).toContain('spells');
    expect(sheetTabsFor('warrior')).not.toContain('spells');
  });

  it('orders tabs Combat · Spells · Inventory · Abilities · Notes for casters', () => {
    expect(sheetTabsFor('mage')).toEqual([
      'combat',
      'spells',
      'inventory',
      'abilities',
      'notes',
    ]);
    expect(sheetTabsFor('warrior')).toEqual([
      'combat',
      'inventory',
      'abilities',
      'notes',
    ]);
  });

  it('locks mythic spells for low-level mage', () => {
    const view = buildSheetView({ ...DEMO_CHARACTER, level: 4 });
    const mythic = spellsForTier(view.spells, 'Mythic');
    expect(mythic.length).toBeGreaterThan(0);
    expect(mythic.every((s) => s.locked)).toBe(true);
    expect(mythic[0]?.lockReason).toMatch(/Lv 6/);
  });

  it('builds saves as 10 + stat', () => {
    const view = buildSheetView(DEMO_CHARACTER);
    const might = view.saves.find((s) => s.label === 'MIGHT');
    expect(might?.value).toBe(9);
  });

  it('tier unlock thresholds match ruleset', () => {
    expect(maxUnlockedSpellTier('mage', 2)).toBe('Minor');
    expect(maxUnlockedSpellTier('mage', 3)).toBe('Major');
    expect(maxUnlockedSpellTier('bard', 7)).toBe('Major');
    expect(maxUnlockedSpellTier('bard', 8)).toBe('Mythic');
  });

  it('does not include a Stats tab', () => {
    expect(buildSheetView(DEMO_CHARACTER).tabs).not.toContain('stats' as never);
  });

  it('labels all saves with display stat names', () => {
    const view = buildSheetView(DEMO_CHARACTER);
    expect(view.saves.map((s) => s.label)).toEqual([
      'MIGHT',
      'FINESSE',
      'WIT',
      'PRESENCE',
    ]);
  });

  it('builds combat weapons with equipped primary', () => {
    const view = buildSheetView(DEMO_CHARACTER);
    const staff = view.weapons.find((w) => w.name === 'Storm Staff');
    expect(staff?.equipped).toBe(true);
    expect(staff?.stat).toBe('Wit');
    expect(staff?.dice).toBe('d6');
  });

  it('includes class armor restriction copy', () => {
    const view = buildSheetView(DEMO_CHARACTER);
    expect(view.armor.restriction).toMatch(/Mage allowed/i);
  });

  it('locks abilities below character level', () => {
    const view = buildSheetView({ ...DEMO_CHARACTER, level: 2 });
    const locked = view.abilities.filter((a) => a.locked);
    expect(locked.length).toBeGreaterThan(0);
    expect(locked[0]?.lockReason).toMatch(/Lv/);
  });

  it('parses inventory quantities', () => {
    const view = buildSheetView({
      ...DEMO_CHARACTER,
      inventory: ['Healing draught ×2', 'Spellbook'],
    });
    expect(view.inventory).toEqual([
      { name: 'Healing draught', qty: 2 },
      { name: 'Spellbook', qty: 1 },
    ]);
  });

  it('includes mana formula for casters', () => {
    const view = buildSheetView(DEMO_CHARACTER);
    expect(view.manaFormula).toMatch(/Wit/);
    expect(view.manaMax).toBe(9);
  });

  it('filters spells by tier', () => {
    const view = buildSheetView(DEMO_CHARACTER);
    const minor = spellsForTier(view.spells, 'Minor');
    expect(minor.every((s) => s.tier === 'Minor')).toBe(true);
    expect(minor.length).toBeGreaterThan(0);
  });

  it('uses API spell definitions when character.spells is populated', () => {
    const view = buildSheetView({
      ...DEMO_CHARACTER,
      spells: [
        {
          id: 'test_bolt',
          name: 'Test Bolt',
          tier: 'Minor',
          mp_cost: 1,
          locked: false,
          locked_reason: null,
        },
        {
          id: 'locked_mythic',
          name: 'Locked Mythic',
          tier: 'Mythic',
          mp_cost: 3,
          locked: true,
          locked_reason: 'Unlocks at Lv 6',
        },
      ],
    });
    expect(view.spells).toHaveLength(2);
    expect(view.spells[0]?.name).toBe('Test Bolt');
    expect(view.spells[0]?.known).toBe(true);
    expect(view.spells[1]?.locked).toBe(true);
    expect(view.spells[1]?.lockReason).toBe('Unlocks at Lv 6');
  });
});
