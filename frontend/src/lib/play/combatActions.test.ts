import { describe, expect, it } from 'vitest';
import {
  combatBlockedReason,
  isActionAllowedInCombat,
} from '@/lib/play/combatActions';

describe('combatActions', () => {
  it('blocks rests and OOC during combat', () => {
    expect(isActionAllowedInCombat('shortrest')).toBe(false);
    expect(isActionAllowedInCombat('longrest')).toBe(false);
    expect(isActionAllowedInCombat('note')).toBe(false);
    expect(combatBlockedReason('note')).toBe('Not available during combat');
  });

  it('allows rolls, cast, and items during combat', () => {
    expect(isActionAllowedInCombat('freeroll')).toBe(true);
    expect(isActionAllowedInCombat('cast')).toBe(true);
    expect(isActionAllowedInCombat('item')).toBe(true);
    expect(combatBlockedReason('freeroll')).toBeNull();
  });
});
