import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import {
  pendingActionToRollPrompt,
  rollTargetFromPendingAction,
} from '@/lib/play/pendingActionAdapter';
import type { PendingAction } from '@/types';

describe('pendingActionToRollPrompt', () => {
  it('uses server-provided fields without inferring stat or dc', () => {
    const action: PendingAction = {
      action_type: 'ask_player_roll',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Might check',
      tool_call_id: 't1',
    };
    const prompt = pendingActionToRollPrompt(action, DEMO_CHARACTER);
    expect(prompt.stubEnriched).toBe(true);
    expect(prompt.stat).toBeUndefined();
    expect(prompt.dc).toBeUndefined();
    expect(prompt.modifier).toBe(0);
    expect(prompt.diceType).toBe('d20');
  });

  it('displays GM-provided stat, die, and dc as sent by the server', () => {
    const action: PendingAction = {
      action_type: 'ask_player_roll',
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Wit check',
      tool_call_id: 't2',
      stat: 'wit',
      modifier: 0,
      dc: 8,
      vs_label: 'DC 8',
      adv_type: 'adv',
      adv_reason: 'flanking',
    };
    const prompt = pendingActionToRollPrompt(action, DEMO_CHARACTER);
    expect(prompt.stubEnriched).toBe(false);
    expect(prompt.stat).toBe('Wit');
    expect(prompt.dc).toBe(8);
    expect(prompt.vsLabel).toBe('DC 8');
    expect(prompt.diceCount).toBe(1);
    expect(prompt.diceType).toBe('d20');
    expect(prompt.advType).toBe('adv');
  });

  it('omits dc and crit footer for damage dice', () => {
    const prompt = pendingActionToRollPrompt(
      {
        action_type: 'ask_player_roll',
        dice_count: 1,
        dice_type: 'd8',
        purpose: 'Longsword damage',
        tool_call_id: 't3',
        modifier: 2,
      },
      DEMO_CHARACTER,
    );
    expect(prompt.diceType).toBe('d8');
    expect(prompt.dc).toBeUndefined();
    expect(prompt.vsLabel).toBeUndefined();
    expect(prompt.footer).toBeUndefined();
    expect(prompt.stubEnriched).toBe(false);
  });
});

describe('rollTargetFromPendingAction', () => {
  it('returns server dc for d20 checks only', () => {
    expect(
      rollTargetFromPendingAction({
        action_type: 'ask_player_roll',
        dice_count: 1,
        dice_type: 'd20',
        purpose: 'Wit check',
        tool_call_id: 't4',
        dc: 8,
      }),
    ).toBe(8);
    expect(
      rollTargetFromPendingAction({
        action_type: 'ask_player_roll',
        dice_count: 1,
        dice_type: 'd8',
        purpose: 'Damage',
        tool_call_id: 't5',
        dc: 8,
      }),
    ).toBeNull();
  });
});
