import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/a11y/motion';
import {
  advanceTypewriterCursor,
  commonPrefixLength,
  sliceRevealed,
} from '@/lib/play/narrationTypewriter';

type Options = {
  /** When false, always show the full target (player bubbles, reduced-motion). */
  enabled?: boolean;
  /** True while the server is still streaming provisional text. */
  streaming?: boolean;
};

/**
 * Reveal `target` letter-by-letter. Historical settled text snaps in full;
 * streaming / catch-up after settle animates toward the latest target.
 */
export function useTypewriterReveal(
  target: string,
  { enabled = true, streaming = false }: Options = {},
): { text: string; revealing: boolean } {
  const reduced = prefersReducedMotion();
  const animate = enabled && !reduced;

  const [cursor, setCursor] = useState(() =>
    animate && streaming ? 0 : target.length,
  );
  const targetRef = useRef(target);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  // Keep cursor coherent when the target is replaced or shortened (sanitize / settle).
  useEffect(() => {
    const prev = targetRef.current;
    targetRef.current = target;
    if (!animate) {
      setCursor(target.length);
      return;
    }
    if (target === prev) return;
    const shared = commonPrefixLength(prev, target);
    setCursor((c) => Math.min(c, shared, target.length));
  }, [target, animate]);

  // Snap when animation is disabled (reduced-motion).
  useEffect(() => {
    if (!animate) setCursor(target.length);
  }, [animate, target.length]);

  const catchingUp = animate && cursor < target.length;

  useEffect(() => {
    if (!catchingUp) return;

    let raf = 0;
    let last = performance.now();
    let alive = true;

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(64, now - last);
      last = now;
      const { cursor: next, done } = advanceTypewriterCursor(
        cursorRef.current,
        targetRef.current.length,
        dt,
      );
      setCursor(next);
      if (!done) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [catchingUp, target]);

  const text = animate ? sliceRevealed(target, cursor) : target;
  const revealing = animate && (streaming || cursor < target.length);

  return { text, revealing };
}
