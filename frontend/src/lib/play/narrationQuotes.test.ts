import { describe, expect, it } from 'vitest';
import { splitNarrationQuotes } from '@/lib/play/narrationQuotes';
import {
  queueNarrationDelta,
  takePendingNarrationDeltas,
} from '@/lib/play/narrationDeltaBuffer';

describe('splitNarrationQuotes', () => {
  it('returns plain text when there are no quotes', () => {
    expect(splitNarrationQuotes('The road winds east.')).toEqual([
      { kind: 'text', value: 'The road winds east.' },
    ]);
  });

  it('highlights straight double-quoted dialogue', () => {
    expect(
      splitNarrationQuotes('She turns. "Consider it a beginning," she says.'),
    ).toEqual([
      { kind: 'text', value: 'She turns. ' },
      { kind: 'quote', value: '"Consider it a beginning,"' },
      { kind: 'text', value: ' she says.' },
    ]);
  });

  it('highlights curly quotes and leaves apostrophes alone', () => {
    expect(
      splitNarrationQuotes('You can’t move. “Stay down,” Sera whispers.'),
    ).toEqual([
      { kind: 'text', value: 'You can’t move. ' },
      { kind: 'quote', value: '“Stay down,”' },
      { kind: 'text', value: ' Sera whispers.' },
    ]);
  });
});

describe('narrationDeltaBuffer', () => {
  it('keeps only the latest cumulative text per tool call', () => {
    const pending = new Map<string, string>();
    queueNarrationDelta(pending, 'a', 'The');
    queueNarrationDelta(pending, 'a', 'The road');
    queueNarrationDelta(pending, 'b', 'Elsewhere');
    const batch = takePendingNarrationDeltas(pending);
    expect(batch.get('a')).toBe('The road');
    expect(batch.get('b')).toBe('Elsewhere');
    expect(pending.size).toBe(0);
  });
});
