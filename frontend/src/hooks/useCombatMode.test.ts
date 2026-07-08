import { describe, expect, it } from 'vitest';
import { combatSplashOnTransition } from '@/hooks/useCombatMode';

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
