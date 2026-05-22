import { describe, expect, it } from 'vitest';
import {
  createDevDemoRollPromptEntry,
  DEV_DEMO_ROLL_PROMPT_ID,
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
});
