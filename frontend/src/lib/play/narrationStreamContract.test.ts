/**
 * Cross-boundary contract check for narration streaming.
 *
 * The reducer tests use hand-written payloads, and the backend tests assert the frames it
 * emits — but nothing catches a field rename on the far side of the wire. This replays SSE
 * frames actually captured from a live turn through the real reducer and the real TurnEvent
 * types, so a backend payload change breaks a test rather than a browser.
 */

import { describe, expect, it } from 'vitest';
import type { TurnEvent } from '@/api/client';
import {
  applyNarrationDelta,
  discardNarration,
  hasStreamingNarration,
  settleNarration,
} from '@/lib/play/narrationStream';
import type { TranscriptEntry } from '@/lib/play/transcript';
import { RECORDED_TURN_FRAMES } from '@/lib/play/__fixtures__/recordedNarrationFrames';

/** The same dispatch `useChat.processTurnStream` performs, minus React. */
function reduce(entries: TranscriptEntry[], event: TurnEvent): TranscriptEntry[] {
  switch (event.type) {
    case 'narration_delta':
      return applyNarrationDelta(entries, event.tool_call_id, event.text, 1);
    case 'narration':
      return settleNarration(entries, event.tool_call_id, event.text, 1);
    case 'narration_discard':
      return discardNarration(entries, event.tool_call_id);
    default:
      return entries;
  }
}

/** Frames arrive from SSE as `{ event, ...payload }` and are re-tagged as `type`. */
function asTurnEvents(): TurnEvent[] {
  return RECORDED_TURN_FRAMES.map(({ event, ...payload }) => ({
    type: event,
    ...payload,
  })) as TurnEvent[];
}

describe('recorded backend frames drive the reducer', () => {
  const events = asTurnEvents();

  it('produces exactly one settled GM bubble', () => {
    const entries = events.reduce(reduce, [] as TranscriptEntry[]);

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('message');
    expect(hasStreamingNarration(entries)).toBe(false);
  });

  it('lands on the authoritative text the tool recorded', () => {
    const entries = events.reduce(reduce, [] as TranscriptEntry[]);
    const settle = RECORDED_TURN_FRAMES.find((f) => f.event === 'narration');

    expect(entries[0]).toMatchObject({ content: settle?.text });
  });

  it('keeps one bubble open for the whole stream, never appending a second', () => {
    let entries: TranscriptEntry[] = [];
    for (const event of events) {
      entries = reduce(entries, event);
      expect(entries).toHaveLength(1);
    }
  });

  it('shows strictly growing text while streaming', () => {
    const seen: string[] = [];
    let entries: TranscriptEntry[] = [];
    for (const event of events) {
      entries = reduce(entries, event);
      const entry = entries[0];
      if (entry.kind === 'message') seen.push(entry.content);
    }

    for (const [earlier, later] of seen.map((s, i) => [s, seen[i + 1]] as const)) {
      if (later === undefined) break;
      expect(later.startsWith(earlier)).toBe(true);
    }
  });

  it('leaves nothing behind if the turn is discarded mid-stream', () => {
    const deltasOnly = events.filter((e) => e.type === 'narration_delta');
    let entries = deltasOnly.reduce(reduce, [] as TranscriptEntry[]);
    const toolCallId = RECORDED_TURN_FRAMES[0].tool_call_id;

    expect(hasStreamingNarration(entries)).toBe(true);
    entries = reduce(entries, { type: 'narration_discard', tool_call_id: toolCallId });

    expect(entries).toEqual([]);
  });
});
