import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import { shouldBlockForLevelUp } from '@/lib/play/levelUp';
import {
  BOSS_DEATH_Z_INDEX,
  COMBAT_SPLASH_Z_INDEX,
  canStartLevelUpCelebration,
  combatSplashInCombatInput,
  combatStripVisible,
  shouldShowLevelUpDialog,
} from '@/lib/play/combatUiGating';

describe('combatSplashInCombatInput (WS-7.1)', () => {
  it('tracks combat edges when boss death is not blocking', () => {
    expect(combatSplashInCombatInput(true, false)).toBe(true);
    expect(combatSplashInCombatInput(false, false)).toBe(false);
  });

  it('suppresses splash input while boss death modal blocks session', () => {
    expect(combatSplashInCombatInput(true, true)).toBe(false);
  });
});

describe('combatStripVisible (WS-7.1)', () => {
  it('shows strip only while in combat', () => {
    expect(combatStripVisible(true)).toBe(true);
    expect(combatStripVisible(false)).toBe(false);
  });
});

describe('canStartLevelUpCelebration', () => {
  it('waits for combat splash idle and quiet narration', () => {
    expect(canStartLevelUpCelebration(true, 'exit', true)).toBe(false);
    expect(canStartLevelUpCelebration(true, 'idle', false)).toBe(false);
    expect(canStartLevelUpCelebration(true, 'idle', true)).toBe(true);
    expect(canStartLevelUpCelebration(false, 'idle', true)).toBe(false);
  });
});

describe('modal z-index stack (WS-7.3)', () => {
  it('places boss death above combat splash', () => {
    expect(BOSS_DEATH_Z_INDEX).toBeGreaterThan(COMBAT_SPLASH_Z_INDEX);
  });
});

describe('level-up after combat path (WS-7.1)', () => {
  it('allows dialog once exploration resumes and splash is idle', () => {
    const character = { ...DEMO_CHARACTER, xp: 1_000 };
    const mustResolve = shouldBlockForLevelUp(character, false);
    expect(mustResolve).toBe(true);
    expect(shouldShowLevelUpDialog(mustResolve, 'idle')).toBe(true);
  });
});
