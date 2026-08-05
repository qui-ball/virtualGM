import { describe, expect, it } from 'vitest';
import {
  TYPEWRITER_CATCHUP_CPS,
  TYPEWRITER_CPS,
  advanceTypewriterCursor,
  commonPrefixLength,
  sliceRevealed,
  typewriterCps,
} from '@/lib/play/narrationTypewriter';

describe('narrationTypewriter', () => {
  it('finds the shared prefix after a sanitize rewrite', () => {
    expect(commonPrefixLength('The road winds.', 'The road ends.')).toBe(9);
    expect(commonPrefixLength('abc', 'xyz')).toBe(0);
  });

  it('uses catch-up speed when the backlog is large', () => {
    expect(typewriterCps(10)).toBe(TYPEWRITER_CPS);
    expect(typewriterCps(80)).toBe(TYPEWRITER_CATCHUP_CPS);
  });

  it('advances the cursor by cps * dt', () => {
    const { cursor, done } = advanceTypewriterCursor(0, 30, 500);
    expect(cursor).toBeCloseTo(TYPEWRITER_CPS * 0.5, 5);
    expect(done).toBe(false);
  });

  it('clamps to the target and reports done', () => {
    const { cursor, done } = advanceTypewriterCursor(98, 100, 1000);
    expect(cursor).toBe(100);
    expect(done).toBe(true);
  });

  it('slices on whole characters', () => {
    expect(sliceRevealed('Hello', 2.9)).toBe('He');
    expect(sliceRevealed('Hello', 0)).toBe('');
    expect(sliceRevealed('Hello', 99)).toBe('Hello');
  });
});
