/**
 * Client-side typewriter reveal for GM narration.
 *
 * Network deltas update the *target* text; this module advances a display
 * cursor toward that target at a steady (catch-up-aware) rate so the bubble
 * reads letter-by-letter even when SSE arrives in large chunks.
 */

/** Base characters revealed per second while keeping pace with the stream. */
export const TYPEWRITER_CPS = 26;

/** Faster rate when the display is far behind the known target. */
export const TYPEWRITER_CATCHUP_CPS = 68;

/** Backlog (chars) at which catch-up speed kicks in. */
export const TYPEWRITER_CATCHUP_THRESHOLD = 48;

export function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

export function typewriterCps(backlog: number): number {
  return backlog >= TYPEWRITER_CATCHUP_THRESHOLD
    ? TYPEWRITER_CATCHUP_CPS
    : TYPEWRITER_CPS;
}

/**
 * Advance the reveal cursor toward `targetLength` by `dtMs`.
 * Returns the new cursor (clamped) and whether more work remains.
 */
export function advanceTypewriterCursor(
  cursor: number,
  targetLength: number,
  dtMs: number,
): { cursor: number; done: boolean } {
  if (cursor >= targetLength) {
    return { cursor: targetLength, done: true };
  }
  const backlog = targetLength - cursor;
  const step = (typewriterCps(backlog) * Math.max(0, dtMs)) / 1000;
  const next = Math.min(targetLength, cursor + step);
  return { cursor: next, done: next >= targetLength };
}

/** Slice by character count; cursor may be fractional between RAF ticks. */
export function sliceRevealed(target: string, cursor: number): string {
  if (cursor <= 0) return '';
  if (cursor >= target.length) return target;
  return target.slice(0, Math.floor(cursor));
}
