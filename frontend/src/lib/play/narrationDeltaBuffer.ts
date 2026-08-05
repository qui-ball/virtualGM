/**
 * Coalesce high-frequency narration_delta frames into at most one React
 * transcript update per animation frame. Settle / discard must flush first so
 * authoritative text never races a stale pending delta.
 */

export type PendingNarrationDeltas = Map<string, string>;

export function queueNarrationDelta(
  pending: PendingNarrationDeltas,
  toolCallId: string,
  text: string,
): void {
  pending.set(toolCallId, text);
}

export function takePendingNarrationDeltas(
  pending: PendingNarrationDeltas,
): PendingNarrationDeltas {
  if (pending.size === 0) return new Map();
  const batch = new Map(pending);
  pending.clear();
  return batch;
}
