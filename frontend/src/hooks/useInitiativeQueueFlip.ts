import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/a11y/motion';

const FLIP_MS = 320;

/**
 * FLIP the initiative portrait row when the queue rotates after a turn advance.
 * Portraits keep their identity via `data-initiative-id`; the finishing combatant
 * appears to slide behind and to the far right of the queue.
 */
export function useInitiativeQueueFlip(orderKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-initiative-id]'),
    );
    const nextRects = new Map<string, DOMRect>();
    for (const node of nodes) {
      const id = node.dataset.initiativeId;
      if (!id) continue;
      nextRects.set(id, node.getBoundingClientRect());
    }

    const prev = prevRectsRef.current;
    if (prev.size > 0 && !prefersReducedMotion()) {
      for (const node of nodes) {
        const id = node.dataset.initiativeId;
        if (!id) continue;
        const first = prev.get(id);
        const last = nextRects.get(id);
        if (!first || !last) continue;
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

        node.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0, 0)' },
          ],
          {
            duration: FLIP_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
          },
        );
      }
    }

    prevRectsRef.current = nextRects;
  }, [orderKey]);

  return containerRef;
}
