/**
 * Tail-following rules for the story transcript.
 *
 * Kept pure so the "stay pinned to the newest line" behaviour can be tested without
 * a DOM: the transcript grows for seconds after the entries array last changed
 * (narration typewrites character by character), so the decision to keep following
 * must not be re-derived from how far the content has grown.
 */

export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/** How far from the bottom the reader can be and still count as "at the tail". */
export const FOLLOW_THRESHOLD_PX = 120;

export function distanceFromBottom(m: ScrollMetrics): number {
  return m.scrollHeight - m.scrollTop - m.clientHeight;
}

export function isAtTail(
  m: ScrollMetrics,
  threshold = FOLLOW_THRESHOLD_PX,
): boolean {
  return distanceFromBottom(m) <= threshold;
}

/** Scroll offset that puts the newest line at the bottom edge. */
export function tailScrollTop(m: ScrollMetrics): number {
  return Math.max(0, m.scrollHeight - m.clientHeight);
}

type FollowInput = {
  /** Whether we were following the tail before this scroll event. */
  following: boolean;
  metrics: ScrollMetrics;
  /** Offset seen on the previous scroll event. */
  lastScrollTop: number;
  threshold?: number;
};

/**
 * Follow state after a scroll event.
 *
 * Following stops only when the reader moves *up*, away from the tail — never
 * because new content pushed the tail further down. It resumes as soon as they
 * come back within the threshold.
 */
export function nextFollowState({
  following,
  metrics,
  lastScrollTop,
  threshold = FOLLOW_THRESHOLD_PX,
}: FollowInput): boolean {
  if (isAtTail(metrics, threshold)) return true;
  if (metrics.scrollTop < lastScrollTop - 1) return false;
  return following;
}
