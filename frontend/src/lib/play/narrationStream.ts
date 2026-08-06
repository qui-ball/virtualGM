/**
 * Transcript transforms for narration that streams in while the model is still writing it.
 *
 * The backend paints `narration_delta` frames from `narrate()`'s in-flight arguments, long
 * before the tool runs. That text is provisional: the tool may still sanitize it differently,
 * drop it (a roll-prompt-only narration), or refuse it (a premature damage narration). So a
 * streaming bubble is always resolved by exactly one of `narration` (settle) or
 * `narration_discard` (remove) carrying the same tool call id.
 *
 * Kept pure and outside React so the lifecycle can be tested without rendering anything.
 */

import {
  createEntryId,
  type TranscriptEntry,
} from '@/lib/play/transcript';
import { sanitizeNarrationText } from '@/lib/play/narrationSanitize';
import { chatMessageToTranscriptEntry } from '@/lib/play/transcriptBuild';

/** Transcript id for the bubble a given narrate() call streams into. */
export function narrationEntryId(toolCallId: string): string {
  return `narration:${toolCallId}`;
}

function isStreamingEntry(
  entry: TranscriptEntry,
  id: string,
): boolean {
  return entry.kind === 'message' && entry.id === id && entry.streaming === true;
}

/**
 * Any message entry carrying this id, streaming or already settled.
 *
 * The upsert paths below match on *this*, not on the streaming flag. Matching only streaming
 * entries would let a delta or settle for an id that already settled fall through to the
 * append branch and push a second entry with a duplicate `id` — a duplicate React key. Ids
 * come from the provider's `tool_call_id` and carry no run or attempt namespace, so reuse
 * across a retry or a later turn is not something this client can rule out.
 */
function isNarrationEntry(entry: TranscriptEntry, id: string): boolean {
  return entry.kind === 'message' && entry.id === id;
}

/**
 * Upsert the provisional bubble for `toolCallId`.
 *
 * Deltas carry the cumulative text, not the fragment that grew it, so an existing bubble is
 * updated in place rather than appended to.
 */
export function applyNarrationDelta(
  entries: TranscriptEntry[],
  toolCallId: string,
  text: string,
  timestamp: number = Date.now(),
): TranscriptEntry[] {
  const id = narrationEntryId(toolCallId);
  const content = sanitizeNarrationText(text);

  if (entries.some((e) => isNarrationEntry(e, id))) {
    return entries.map((e) =>
      isNarrationEntry(e, id) ? { ...e, content, streaming: true } : e,
    );
  }

  return [
    ...entries,
    {
      kind: 'message',
      id,
      role: 'gm',
      content,
      timestamp,
      streaming: true,
    },
  ];
}

/**
 * Resolve a streaming bubble against the authoritative text `narrate()` recorded.
 *
 * With no matching bubble — an atomic provider, or a client that missed the deltas — this
 * appends a full-text entry with `reveal: true` so the typewriter still runs for consistency.
 *
 * Nothing here touches *other* open bubbles. Narrations of one response stream in parallel and
 * may settle in any order, so an unsettled bubble is not evidence of a lost frame; the backend
 * retracts the ones that really were abandoned before the turn ends.
 */
export function settleNarration(
  entries: TranscriptEntry[],
  toolCallId: string | undefined,
  text: string,
  timestamp: number = Date.now(),
): TranscriptEntry[] {
  const id = toolCallId ? narrationEntryId(toolCallId) : null;
  const content = sanitizeNarrationText(text);

  if (id && entries.some((e) => isNarrationEntry(e, id))) {
    return entries.map((e) =>
      isNarrationEntry(e, id)
        ? {
            ...e,
            content,
            streaming: undefined,
            reveal: undefined,
          }
        : e,
    );
  }

  const entryId = id ?? createEntryId();
  const base = chatMessageToTranscriptEntry(
    { role: 'gm', content: text, timestamp },
    entryId,
  );
  if (base.kind !== 'message') {
    return [...entries, base];
  }
  return [
    ...entries,
    {
      ...base,
      content,
      // Atomic settle: still typewrite for visual consistency with streamed narrations.
      reveal: true,
    },
  ];
}

/** Clear the client-only typewriter flag once the bubble has finished revealing. */
export function clearNarrationReveal(
  entries: TranscriptEntry[],
  entryId: string,
): TranscriptEntry[] {
  if (
    !entries.some(
      (e) => e.kind === 'message' && e.id === entryId && e.reveal === true,
    )
  ) {
    return entries;
  }
  return entries.map((e) =>
    e.kind === 'message' && e.id === entryId
      ? { ...e, reveal: undefined }
      : e,
  );
}

/**
 * Remove the provisional bubble for a narration the tool dropped or vetoed.
 *
 * By default only a still-streaming entry is removable, so a discard arriving after a settle
 * — or for an id this client never saw — leaves the transcript alone. `retract` overrides
 * that: the server sends it when a whole attempt is being regenerated, where even settled
 * text must go or it would stand alongside the retry's replacement.
 */
export function discardNarration(
  entries: TranscriptEntry[],
  toolCallId: string,
  retract = false,
): TranscriptEntry[] {
  const id = narrationEntryId(toolCallId);
  const removable = (e: TranscriptEntry) =>
    retract ? e.kind === 'message' && e.id === id : isStreamingEntry(e, id);

  if (!entries.some(removable)) {
    return entries;
  }
  return entries.filter((e) => !removable(e));
}

/**
 * Drop the bubbles still streaming for `toolCallIds`.
 *
 * The safety net for a turn that ends without resolving its narrations — a dropped
 * connection, a crash mid-turn — so half a sentence cannot be left standing.
 *
 * The sweep is scoped to the ids the finishing turn actually painted. Turns overlap: the UI
 * unlocks as soon as a roll prompt arrives, so the player's next action can be streaming
 * narration while the previous turn's response body is still closing. An unscoped sweep run
 * from that tail would erase the live narration of the turn that followed it.
 */
export function clearStreamingNarrations(
  entries: TranscriptEntry[],
  toolCallIds?: Iterable<string>,
): TranscriptEntry[] {
  const owned =
    toolCallIds === undefined
      ? null
      : new Set(Array.from(toolCallIds, narrationEntryId));

  const sweepable = (e: TranscriptEntry) =>
    e.kind === 'message' &&
    e.streaming === true &&
    (owned === null || owned.has(e.id));

  if (!entries.some(sweepable)) {
    return entries;
  }
  return entries.filter((e) => !sweepable(e));
}

/** True when any narration is still being written. */
export function hasStreamingNarration(entries: TranscriptEntry[]): boolean {
  return entries.some((e) => e.kind === 'message' && e.streaming === true);
}

/**
 * True while narration is streaming from the server or still typewriting a
 * full-payload settle (`reveal`).
 */
export function hasActiveNarrationPresentation(
  entries: TranscriptEntry[],
): boolean {
  return entries.some(
    (e) =>
      e.kind === 'message' &&
      (e.streaming === true || e.reveal === true),
  );
}
