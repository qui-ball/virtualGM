import { describe, expect, it } from 'vitest';
import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
import type { CharacterState, PendingAction } from '@/types';

const WARRIOR: CharacterState = {
  name: 'Aldric',
  character_class: 'warrior',
  level: 1,
  xp: 0,
  stats: { might: 2, finesse: 1, wit: 0, presence: -1 },
  hp: 12,
  hp_max: 12,
  evasion: 14,
  mana: null,
  mana_max: null,
  conditions: [],
  class_abilities: [],
  spells_known: [],
  gold: 10,
  inventory: [],
  equipped_weapon: null,
  equipped_armor: null,
};

describe('pendingActionToRollPrompt', () => {
  it('marks stub when API fields are missing', () => {
    const action: PendingAction = {
      action_type: 'roll_check',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Might check',
      tool_call_id: 't1',
    };
    const prompt = pendingActionToRollPrompt(action, WARRIOR);
    expect(prompt.stubEnriched).toBe(true);
    expect(prompt.stat).toBe('Mig');
    expect(prompt.modifier).toBe(2);
  });

  it('uses API enrichment when present', () => {
    const action: PendingAction = {
      action_type: 'roll_check',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Wit check',
      tool_call_id: 't2',
      stat: 'wit',
      modifier: 2,
      dc: 14,
      vs_label: 'vs Eva 12',
      adv_type: 'adv',
      adv_reason: 'flanking',
    };
    const prompt = pendingActionToRollPrompt(action, WARRIOR);
    expect(prompt.stubEnriched).toBe(false);
    expect(prompt.advType).toBe('adv');
    expect(prompt.vsLabel).toBe('vs Eva 12');
  });

  it('infers finesse from purpose text when stat omitted', () => {
    const action: PendingAction = {
      action_type: 'attack',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Dagger strike with finesse',
      tool_call_id: 't3',
    };
    const prompt = pendingActionToRollPrompt(action, WARRIOR);
    expect(prompt.stat).toBe('Fin');
    expect(prompt.modifier).toBe(1);
  });

  it('defaults disadvantage when adv_type invalid', () => {
    const action: PendingAction = {
      action_type: 'save',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Presence save',
      tool_call_id: 't4',
      adv_type: 'bogus' as 'adv',
    };
    const prompt = pendingActionToRollPrompt(action, WARRIOR);
    expect(prompt.advType).toBe('norm');
  });

  it('includes d20 crit footer for stub rolls', () => {
    const prompt = pendingActionToRollPrompt(
      {
        action_type: 'roll',
        dice_count: 1,
        dice_type: 'd20',
        purpose: 'Check',
        tool_call_id: 't5',
      },
      WARRIOR,
    );
    expect(prompt.footer).toBe('crit on nat-20');
  });
});
