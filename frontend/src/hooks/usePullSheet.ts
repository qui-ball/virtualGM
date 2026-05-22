import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  clampPullOffset,
  computeFullPullMax,
  computePullHeights,
  computeReleasePull,
  shouldSnapSheetOpenFromPull,
  type PullSheetConfig,
} from '@/lib/play/pullSheet';
import {
  FALLBACK_FULL_PULL,
  PHASE1_MAX,
} from '@/lib/play/sessionConstants';

export type PullSheetAnchorHeights = {
  chromeAbovePull: number;
  footerChrome: number;
};

type UsePullSheetOptions = {
  measureAnchors?: () => PullSheetAnchorHeights;
};

type DragState = {
  startY: number;
  startOpen: boolean;
  moved: boolean;
  pointerId: number;
};

export function usePullSheet(
  containerRef: RefObject<HTMLElement | null>,
  options: UsePullSheetOptions = {},
) {
  const { measureAnchors } = options;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fullPullMax, setFullPullMax] = useState(FALLBACK_FULL_PULL);
  const dragRef = useRef<DragState>({
    startY: 0,
    startOpen: false,
    moved: false,
    pointerId: 0,
  });
  const draggingRef = useRef(false);

  const pullConfig: PullSheetConfig = {
    phase1Max: PHASE1_MAX,
    fullPullMax,
  };

  const remeasure = useCallback(() => {
    if (draggingRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const anchors = measureAnchors?.();
    if (!anchors) return;
    setFullPullMax(
      computeFullPullMax(
        el.clientHeight,
        anchors.chromeAbovePull,
        anchors.footerChrome,
      ),
    );
  }, [containerRef, measureAnchors]);

  useLayoutEffect(() => {
    remeasure();
    const el = containerRef.current;
    if (!el || !measureAnchors) return;
    const ro = new ResizeObserver(() => remeasure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, measureAnchors, remeasure]);

  const onHandleDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      const el = containerRef.current;
      if (!el) return;
      dragRef.current = {
        startY: e.clientY,
        startOpen: sheetOpen,
        moved: false,
        pointerId: e.pointerId,
      };
      draggingRef.current = true;
      setDragging(true);
      setDragOffset(0);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [containerRef, sheetOpen],
  );

  const onHandleMove = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (!draggingRef.current) return;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dy) > 4) dragRef.current.moved = true;
      setDragOffset(
        clampPullOffset(dragRef.current.startOpen, dy, fullPullMax),
      );
    },
    [fullPullMax],
  );

  const onHandleUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (!draggingRef.current) return;
      const wasMoved = dragRef.current.moved;
      const dy = e.clientY - dragRef.current.startY;
      const delta = clampPullOffset(dragRef.current.startOpen, dy, fullPullMax);

      draggingRef.current = false;
      e.currentTarget.releasePointerCapture(dragRef.current.pointerId);

      if (!wasMoved) {
        setSheetOpen((open) => !open);
      } else {
        const releasePull = computeReleasePull(
          dragRef.current.startOpen,
          delta,
          fullPullMax,
        );
        setSheetOpen(
          shouldSnapSheetOpenFromPull(releasePull, fullPullMax),
        );
      }
      setDragOffset(0);
      setDragging(false);
      requestAnimationFrame(() => remeasure());
    },
    [fullPullMax, remeasure],
  );

  const onHandleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSheetOpen((open) => !open);
      }
    },
    [],
  );

  const { topH, botH, openness } = computePullHeights(
    sheetOpen,
    dragging,
    dragOffset,
    pullConfig,
  );

  return {
    sheetOpen,
    dragging,
    topH,
    botH,
    openness,
    fullPullMax,
    onHandleDown,
    onHandleMove,
    onHandleUp,
    onHandleKeyDown,
  };
};
