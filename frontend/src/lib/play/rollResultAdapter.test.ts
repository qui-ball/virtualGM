import { describe, expect, it } from 'vitest';
import { rollResultPayloadToFields } from '@/lib/play/rollResultAdapter';
import type { RollResultPayload } from '@/types';

describe('rollResultPayloadToFields', () => {
  it('maps API snake_case to transcript fields', () => {
    const payload: RollResultPayload = {
      label: 'Strike',
      nat: 18,
      die_a: 12,
      die_b: 18,
      total: 22,
      modifier: 4,
      adv_used: 'adv',
      crit: false,
      fumble: false,
      pass: true,
      vs: 15,
      stat: 'Fin',
    };
    const fields = rollResultPayloadToFields(payload, 'prompt-1');
    expect(fields.promptId).toBe('prompt-1');
    expect(fields.dieA).toBe(12);
    expect(fields.dieB).toBe(18);
    expect(fields.advUsed).toBe('adv');
    expect(fields.pass).toBe(true);
  });
});
