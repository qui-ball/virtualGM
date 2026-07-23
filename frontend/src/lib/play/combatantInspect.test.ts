import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import { buildCombatantInspectView } from '@/lib/play/combatantInspect';
import type { EnemyState } from '@/types';

const goblin: EnemyState = {
  name: 'Goblin 1',
  hp: 3,
  hp_max: 5,
  evasion: 12,
  attack_modifier: 2,
  damage: '1d6',
  conditions: ['poisoned'],
};

describe('buildCombatantInspectView (WS-7.1)', () => {
  it('shows PC vitals when player chip is tapped', () => {
    const view = buildCombatantInspectView(
      DEMO_CHARACTER.name,
      DEMO_CHARACTER,
      {},
    );
    expect(view.kind).toBe('pc');
    if (view.kind === 'pc') {
      expect(view.lines[0]).toContain('HP');
      expect(view.lines.some((l) => l.startsWith('Evasion'))).toBe(true);
    }
  });

  it('shows enemy stats when enemy chip is tapped', () => {
    const view = buildCombatantInspectView('Goblin 1', DEMO_CHARACTER, {
      goblin_1: goblin,
    });
    expect(view.kind).toBe('enemy');
    if (view.kind === 'enemy') {
      expect(view.lines).toEqual([
        'HP 3/5',
        'Evasion 12',
        'Conditions poisoned',
      ]);
    }
  });

  it('shows unknown when combatant cannot be resolved', () => {
    const view = buildCombatantInspectView('Mystery', DEMO_CHARACTER, {});
    expect(view.kind).toBe('unknown');
  });
});
