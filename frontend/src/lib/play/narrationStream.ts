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

  if (entries.some((e) => isStreamingEntry(e, id))) {
    return entries.map((e) =>
      isStreamingEntry(e, id) ? { ...e, content } : e,
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
 * With no streaming bubble — an atomic provider, or a client that missed the deltas — this
 * appends a settled entry, which is exactly the pre-streaming behavior.
 */
export function settleNarration(
  entries: TranscriptEntry[],
  toolCallId: string | undefined,
  text: string,
  timestamp: number = Date.now(),
): TranscriptEntry[] {
  const id = toolCallId ? narrationEntryId(toolCallId) : null;

  if (id && entries.some((e) => isStreamingEntry(e, id))) {
    return entries.map((e) =>
      isStreamingEntry(e, id)
        ? { ...e, content: sanitizeNarrationText(text), streaming: undefined }
        : e,
    );
  }

  return [
    ...entries,
    chatMessageToTranscriptEntry(
      { role: 'gm', content: text, timestamp },
      id ?? createEntryId(),
    ),
  ];
}

/** Remove the provisional bubble for a narration the tool dropped or vetoed. */
export function discardNarration(
  entries: TranscriptEntry[],
  toolCallId: string,
): TranscriptEntry[] {
  const id = narrationEntryId(toolCallId);
  // Only streaming entries are removable — a discard that arrives after a settle, or for an
  // id this client never saw, must leave the transcript alone.
  if (!entries.some((e) => isStreamingEntry(e, id))) {
    return entries;
  }
  return entries.filter((e) => !isStreamingEntry(e, id));
}

/**
 * Drop every bubble still streaming.
 *
 * The safety net for a turn that ends without resolving its narrations — a dropped
 * connection, a crash mid-turn — so half a sentence cannot be left standing.
 */
export function clearStreamingNarrations(
  entries: TranscriptEntry[],
): TranscriptEntry[] {
  if (!entries.some((e) => e.kind === 'message' && e.streaming)) {
    return entries;
  }
  return entries.filter((e) => !(e.kind === 'message' && e.streaming));
}

/** True when any narration is still being written. */
export function hasStreamingNarration(entries: TranscriptEntry[]): boolean {
  return entries.some((e) => e.kind === 'message' && e.streaming === true);
}
