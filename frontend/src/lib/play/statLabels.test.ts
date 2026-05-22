import { describe, expect, it } from 'vitest';
import { STAT_DISPLAY_LABELS, statDisplayLabel } from '@/lib/play/statLabels';
import { STAT_KEYS } from '@/lib/play/stats';

describe('statDisplayLabel', () => {
  it('returns uppercase chip labels', () => {
    expect(statDisplayLabel('might')).toBe('MIGHT');
    expect(statDisplayLabel('finesse')).toBe('FINESSE');
    expect(statDisplayLabel('wit')).toBe('WIT');
    expect(statDisplayLabel('presence')).toBe('PRESENCE');
  });

  it('covers all stat keys in STAT_DISPLAY_LABELS', () => {
    for (const key of STAT_KEYS) {
      expect(STAT_DISPLAY_LABELS[key]).toBe(statDisplayLabel(key));
    }
  });
});
