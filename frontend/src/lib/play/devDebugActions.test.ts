import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import { applyDebugGamePatch, syncGameStateFlags } from '@/lib/play/devDebugActions';
import type { GameStateSnapshot } from '@/types';

function baseState(): GameStateSnapshot {
  return {
    character: { ...DEMO_CHARACTER },
    enemies: {},
    countdowns: {},
    in_combat: false,
    boss_encounter: false,
    pending_level_up: false,
  };
}

describe('applyDebugGamePatch', () => {
  it('level_up_pending opens blocking dialog', () => {
    const next = applyDebugGamePatch(baseState(), 'level_up_pending');
    expect(next?.pending_level_up).toBe(true);
    expect(next?.character?.xp).toBeGreaterThanOrEqual(100);
    expect(next?.in_combat).toBe(false);
  });

  it('level_up_clear removes pending state', () => {
    const pending = applyDebugGamePatch(baseState(), 'level_up_pending');
    const cleared = applyDebugGamePatch(pending!, 'level_up_clear');
    expect(cleared?.pending_level_up).toBe(false);
    expect(cleared?.character?.xp).toBe(0);
  });

  it('demo_conditions adds poisoned and stunned', () => {
    const next = applyDebugGamePatch(baseState(), 'demo_conditions');
    expect(next?.character?.conditions).toEqual(['poisoned', 'stunned']);
  });

  it('enter_combat sets initiative sample for HUD', () => {
    const next = applyDebugGamePatch(baseState(), 'enter_combat');
    expect(next?.in_combat).toBe(true);
    expect(next?.initiative_order).toEqual([
      DEMO_CHARACTER.name,
      'Goblin 1',
      'Goblin 2',
    ]);
    expect(next?.current_turn_index).toBe(0);
  });

  it('exit_combat clears initiative', () => {
    const inCombat = applyDebugGamePatch(baseState(), 'enter_combat');
    const next = applyDebugGamePatch(inCombat!, 'exit_combat');
    expect(next?.in_combat).toBe(false);
    expect(next?.initiative_order).toEqual([]);
    expect(next?.current_turn_index).toBe(0);
  });
});

describe('syncGameStateFlags', () => {
  it('derives pending_level_up from xp and combat', () => {
    const gs = baseState();
    gs.character!.xp = 1_000;
    expect(syncGameStateFlags(gs).pending_level_up).toBe(true);
  });
});
