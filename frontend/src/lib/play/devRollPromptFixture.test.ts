import { describe, expect, it } from 'vitest';
import {
  createDevDemoRollPromptEntry,
  DEV_DEMO_PENDING_ACTION,
  DEV_DEMO_ROLL_PROMPT_ID,
  isDevDemoPendingAction,
} from '@/lib/play/devRollPromptFixture';

describe('devRollPromptFixture', () => {
  it('creates an unrolled roll_prompt with enriched fields', () => {
    const entry = createDevDemoRollPromptEntry(null);
    expect(entry.kind).toBe('roll_prompt');
    expect(entry.id).toBe(DEV_DEMO_ROLL_PROMPT_ID);
    if (entry.kind !== 'roll_prompt') return;
    expect(entry.rolled).toBe(false);
    expect(entry.prompt.label).toBe('Strike the goblin');
    expect(entry.prompt.stat).toBe('Fin');
    expect(entry.prompt.modifier).toBe(4);
    expect(entry.prompt.advType).toBe('adv');
    expect(entry.prompt.stubEnriched).toBe(false);
  });

  it('detects dev-only pending actions', () => {
    expect(isDevDemoPendingAction(DEV_DEMO_PENDING_ACTION)).toBe(true);
    expect(isDevDemoPendingAction(null)).toBe(false);
    expect(
      isDevDemoPendingAction({
        ...DEV_DEMO_PENDING_ACTION,
        tool_call_id: 'real-id',
      }),
    ).toBe(false);
  });
});
