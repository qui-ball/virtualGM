import { describe, expect, it } from 'vitest';
import { advanceLevelUpCelebration } from '@/hooks/useLevelUpCelebration';

describe('advanceLevelUpCelebration', () => {
  it('stays idle while narration is still presenting', () => {
    expect(advanceLevelUpCelebration(true, true, false, 'idle')).toBe('idle');
  });

  it('stays idle while combat splash is showing', () => {
    expect(advanceLevelUpCelebration(true, false, true, 'idle')).toBe('idle');
  });

  it('opens splash once combat and narration are quiet', () => {
    expect(advanceLevelUpCelebration(true, true, true, 'idle')).toBe('splash');
  });

  it('holds splash/dialog once started even if quiet flickers', () => {
    expect(advanceLevelUpCelebration(true, true, false, 'splash')).toBe(
      'splash',
    );
    expect(advanceLevelUpCelebration(true, true, false, 'dialog')).toBe(
      'dialog',
    );
  });

  it('resets when level-up is no longer pending', () => {
    expect(advanceLevelUpCelebration(false, true, true, 'dialog')).toBe(
      'idle',
    );
  });
});
