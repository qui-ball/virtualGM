import { describe, expect, it } from 'vitest';
import {
  advanceCombatSplashState,
  combatSplashOnTransition,
} from '@/hooks/useCombatMode';

describe('combatSplashOnTransition', () => {
  it('skips session bootstrap', () => {
    expect(combatSplashOnTransition(null, true)).toBeNull();
    expect(combatSplashOnTransition(null, false)).toBeNull();
  });

  it('detects enter and exit edges only', () => {
    expect(combatSplashOnTransition(false, true)).toBe('enter');
    expect(combatSplashOnTransition(true, false)).toBe('exit');
    expect(combatSplashOnTransition(true, true)).toBeNull();
    expect(combatSplashOnTransition(false, false)).toBeNull();
  });
});

describe('advanceCombatSplashState (WS-7.1)', () => {
  it('plays enter splash when combat begins after bootstrap', () => {
    const boot = advanceCombatSplashState(null, false, 'idle');
    const enter = advanceCombatSplashState(boot.prevInCombat, true, boot.splashPhase);
    expect(enter.splashPhase).toBe('enter');
  });

  it('plays exit splash when combat ends', () => {
    let state = advanceCombatSplashState(null, false, 'idle');
    state = advanceCombatSplashState(state.prevInCombat, true, state.splashPhase);
    state = advanceCombatSplashState(state.prevInCombat, true, 'idle');
    const exit = advanceCombatSplashState(state.prevInCombat, false, state.splashPhase);
    expect(exit.splashPhase).toBe('exit');
  });

  it('does not replay enter splash on mid-fight reinforcement', () => {
    let state = advanceCombatSplashState(null, false, 'idle');
    state = advanceCombatSplashState(state.prevInCombat, true, state.splashPhase);
    state = advanceCombatSplashState(state.prevInCombat, true, 'idle');
    const reinforce = advanceCombatSplashState(
      state.prevInCombat,
      true,
      state.splashPhase,
    );
    expect(reinforce.splashPhase).toBe('idle');
    expect(combatSplashOnTransition(reinforce.prevInCombat, true)).toBeNull();
  });
});
