import { useCallback, useRef } from 'react';

const DEFAULT_THRESHOLD_PX = 8;

type DragState = {
  active: boolean;
  startX: number;
  scrollLeft: number;
  dragged: boolean;
};

/**
 * Horizontal drag-to-scroll for initiative chips (touch + mouse).
 * Returns whether the last gesture was a drag (suppress tap/click).
 */
export function useHorizontalDragScroll(thresholdPx = DEFAULT_THRESHOLD_PX) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({
    active: false,
    startX: 0,
    scrollLeft: 0,
    dragged: false,
  });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el) return;
      dragRef.current = {
        active: true,
        startX: event.clientX,
        scrollLeft: el.scrollLeft,
        dragged: false,
      };
      el.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el || !dragRef.current.active) return;
      const delta = event.clientX - dragRef.current.startX;
      if (Math.abs(delta) >= thresholdPx) {
        dragRef.current.dragged = true;
      }
      el.scrollLeft = dragRef.current.scrollLeft - delta;
    },
    [thresholdPx],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    dragRef.current.active = false;
  }, []);

  const consumeWasDrag = useCallback(() => {
    const was = dragRef.current.dragged;
    dragRef.current.dragged = false;
    return was;
  }, []);

  return {
    scrollRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    consumeWasDrag,
  };
}
