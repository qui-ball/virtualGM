import { describe, expect, it } from 'vitest';
import {
  applyNarrationDelta,
  clearStreamingNarrations,
  discardNarration,
  hasStreamingNarration,
  narrationEntryId,
  settleNarration,
} from '@/lib/play/narrationStream';
import type { TranscriptEntry } from '@/lib/play/transcript';

const FULL = 'The iron box is cold. Something inside it shifts.';

function playerLine(id = 'p1'): TranscriptEntry {
  return {
    kind: 'message',
    id,
    role: 'player',
    content: 'I open the box',
    timestamp: 1,
  };
}

function gmEntries(entries: TranscriptEntry[]) {
  return entries.filter((e) => e.kind === 'message' && e.role === 'gm');
}

function stream(
  entries: TranscriptEntry[],
  toolCallId: string,
  texts: string[],
): TranscriptEntry[] {
  return texts.reduce(
    (acc, text) => applyNarrationDelta(acc, toolCallId, text, 2),
    entries,
  );
}

describe('applyNarrationDelta', () => {
  it('creates a streaming entry when none exists', () => {
    const entries = applyNarrationDelta([playerLine()], 'call-1', 'The iron', 2);

    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      kind: 'message',
      id: narrationEntryId('call-1'),
      role: 'gm',
      content: 'The iron',
      streaming: true,
    });
  });

  it('updates the entry in place rather than appending', () => {
    const entries = stream([playerLine()], 'call-1', [
      'The iron',
      'The iron box is cold.',
      FULL,
    ]);

    expect(entries).toHaveLength(2);
    expect(gmEntries(entries)[0]).toMatchObject({ content: FULL, streaming: true });
  });

  it('keeps two concurrent tool call ids in separate entries', () => {
    let entries = applyNarrationDelta([], 'call-a', 'Alpha', 2);
    entries = applyNarrationDelta(entries, 'call-b', 'Beta', 3);
    entries = applyNarrationDelta(entries, 'call-a', 'Alpha one.', 4);

    expect(entries.map((e) => e.kind === 'message' && e.content)).toEqual([
      'Alpha one.',
      'Beta',
    ]);
  });

  it('strips leaked tool markup that reaches the client', () => {
    const entries = applyNarrationDelta(
      [],
      'call-1',
      'The wind dies.<tool_call>ask_player_roll<arg_key>dice_type</arg_key>',
      2,
    );

    expect(entries[0]).toMatchObject({ content: 'The wind dies.' });
  });

  it('does not mutate the input array', () => {
    const original = [playerLine()];
    applyNarrationDelta(original, 'call-1', 'The iron', 2);

    expect(original).toHaveLength(1);
  });
});

describe('settleNarration', () => {
  it('settles a streaming entry to the authoritative text (AE1)', () => {
    const streamed = stream([playerLine()], 'call-1', ['The iron', 'The iron box is']);
    const entries = settleNarration(streamed, 'call-1', FULL, 5);

    expect(entries).toHaveLength(2);
    const gm = gmEntries(entries)[0];
    expect(gm).toMatchObject({ content: FULL });
    expect((gm as { streaming?: boolean }).streaming).toBeUndefined();
  });

  it('appends a settled entry when no delta preceded it (AE5)', () => {
    const entries = settleNarration([playerLine()], 'call-1', FULL, 5);

    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      kind: 'message',
      role: 'gm',
      content: FULL,
    });
    expect((entries[1] as { streaming?: boolean }).streaming).toBeUndefined();
  });

  it('appends when the settle carries no tool call id at all', () => {
    const entries = settleNarration([], undefined, FULL, 5);

    expect(gmEntries(entries)[0]).toMatchObject({ content: FULL });
  });

  it('settles two concurrent narrations independently (R4)', () => {
    let entries = applyNarrationDelta([], 'call-a', 'Alpha', 2);
    entries = applyNarrationDelta(entries, 'call-b', 'Beta', 3);
    entries = settleNarration(entries, 'call-b', 'Beta two.', 4);
    entries = settleNarration(entries, 'call-a', 'Alpha one.', 5);

    expect(entries.map((e) => e.kind === 'message' && e.content)).toEqual([
      'Alpha one.',
      'Beta two.',
    ]);
    expect(hasStreamingNarration(entries)).toBe(false);
  });

  it('keeps the bubble in place rather than reordering it', () => {
    let entries = applyNarrationDelta([playerLine()], 'call-1', 'Alpha', 2);
    entries = [...entries, playerLine('p2')];
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 5);

    expect(entries.map((e) => e.id)).toEqual([
      'p1',
      narrationEntryId('call-1'),
      'p2',
    ]);
  });
});

describe('discardNarration', () => {
  it('removes the matching streaming entry and leaves the rest alone (AE3, AE4)', () => {
    const streamed = stream([playerLine()], 'call-1', ['The goblin crumples']);
    const entries = discardNarration(streamed, 'call-1');

    expect(entries).toEqual([playerLine()]);
  });

  it('is a no-op for an unknown id', () => {
    const streamed = stream([], 'call-1', ['Alpha']);

    expect(discardNarration(streamed, 'never-seen')).toBe(streamed);
  });

  it('does not remove an already-settled entry', () => {
    let entries = applyNarrationDelta([], 'call-1', 'Alpha', 2);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 3);
    const settled = entries;

    expect(discardNarration(settled, 'call-1')).toBe(settled);
  });

  it('retracts an already-settled entry when the server is regenerating the turn', () => {
    let entries = applyNarrationDelta([playerLine()], 'call-1', 'Alpha', 2);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 3);

    expect(discardNarration(entries, 'call-1', true)).toEqual([playerLine()]);
  });

  it('retract is still a no-op for an id the client never saw', () => {
    const streamed = stream([], 'call-1', ['Alpha']);

    expect(discardNarration(streamed, 'never-seen', true)).toBe(streamed);
  });
});

describe('duplicate entry ids', () => {
  it('a delta for an already-settled id updates in place instead of appending', () => {
    let entries = applyNarrationDelta([], 'call-1', 'Alpha', 2);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 3);
    entries = applyNarrationDelta(entries, 'call-1', 'Reused', 4);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ content: 'Reused', streaming: true });
  });

  it('a repeated settle for one id does not append a second entry', () => {
    let entries = applyNarrationDelta([], 'call-1', 'Alpha', 2);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 3);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 4);

    expect(entries).toHaveLength(1);
  });

  it('never produces two entries sharing an id', () => {
    let entries = applyNarrationDelta([], 'call-1', 'Alpha', 2);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 3);
    entries = applyNarrationDelta(entries, 'call-1', 'Again', 4);
    entries = settleNarration(entries, 'call-1', 'Again settled.', 5);

    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leaves a concurrent narration streaming', () => {
    let entries = applyNarrationDelta([], 'call-a', 'Alpha', 2);
    entries = applyNarrationDelta(entries, 'call-b', 'Beta', 3);
    entries = discardNarration(entries, 'call-a');

    expect(entries.map((e) => e.kind === 'message' && e.content)).toEqual(['Beta']);
  });

  it('allows a fresh narration after a veto (AE3 retry)', () => {
    let entries = applyNarrationDelta([], 'call-1', 'It dies.', 2);
    entries = discardNarration(entries, 'call-1');
    entries = applyNarrationDelta(entries, 'call-2', 'Your blade bites deep.', 3);
    entries = settleNarration(entries, 'call-2', 'Your blade bites deep.', 4);

    expect(gmEntries(entries)).toHaveLength(1);
    expect(gmEntries(entries)[0]).toMatchObject({
      content: 'Your blade bites deep.',
    });
  });
});

describe('clearStreamingNarrations', () => {
  it('clears any open streaming entry', () => {
    const streamed = stream([playerLine()], 'call-1', ['Half a sen']);

    expect(clearStreamingNarrations(streamed)).toEqual([playerLine()]);
  });

  it('leaves settled narration untouched and returns the same array', () => {
    let entries = applyNarrationDelta([], 'call-1', 'Alpha', 2);
    entries = settleNarration(entries, 'call-1', 'Alpha one.', 3);

    expect(clearStreamingNarrations(entries)).toBe(entries);
  });
});

describe('hasStreamingNarration', () => {
  it('is true only while a narration is open', () => {
    expect(hasStreamingNarration([playerLine()])).toBe(false);

    const streamed = stream([], 'call-1', ['Alpha']);
    expect(hasStreamingNarration(streamed)).toBe(true);

    expect(hasStreamingNarration(settleNarration(streamed, 'call-1', 'Alpha.', 3))).toBe(
      false,
    );
  });
});
