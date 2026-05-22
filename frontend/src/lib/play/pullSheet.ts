export type PullSheetConfig = {
  phase1Max: number;
  fullPullMax: number;
};

export type PullSheetHeights = {
  renderPull: number;
  topH: number;
  botH: number;
  openness: number;
};

export function clampPullOffset(
  startOpen: boolean,
  dragOffset: number,
  fullPullMax: number,
): number {
  const startPull = startOpen ? fullPullMax : 0;
  const desired = startPull + dragOffset;
  const clamped = Math.max(0, Math.min(fullPullMax, desired));
  return clamped - startPull;
}

export function computePullHeights(
  sheetOpen: boolean,
  dragging: boolean,
  dragOffset: number,
  config: PullSheetConfig,
): PullSheetHeights {
  const { phase1Max, fullPullMax } = config;
  const basePull = sheetOpen ? fullPullMax : 0;
  const renderPull = dragging
    ? Math.max(0, Math.min(fullPullMax, basePull + dragOffset))
    : basePull;
  const topH = Math.min(renderPull, phase1Max);
  const botH = Math.max(0, renderPull - phase1Max);
  const openness = fullPullMax > 0 ? renderPull / fullPullMax : 0;

  return { renderPull, topH, botH, openness };
}

/** Finger past mid-screen of container → sheet stays open. */
export function shouldSnapSheetOpen(
  finalClientY: number,
  containerTop: number,
  containerHeight: number,
): boolean {
  const halfH = containerHeight / 2;
  const relY = finalClientY - containerTop;
  return relY > halfH;
}

/** Pull distance at release (px), from drag start state + clamped delta. */
export function computeReleasePull(
  startOpen: boolean,
  dragDelta: number,
  fullPullMax: number,
): number {
  const startPull = startOpen ? fullPullMax : 0;
  return Math.max(0, Math.min(fullPullMax, startPull + dragDelta));
}

/** Snap open when release position passes threshold (fraction of full pull). */
export function shouldSnapSheetOpenFromPull(
  releasePull: number,
  fullPullMax: number,
  threshold = 0.42,
): boolean {
  if (fullPullMax <= 0) return false;
  return releasePull > fullPullMax * threshold;
}

/**
 * Max pull distance for drag animation (px).
 * Never exceeds space above the pinned footer (pull handle + composer).
 */
export function computeFullPullMax(
  containerHeight: number,
  chromeAbovePull: number,
  footerChrome: number,
): number {
  const expandable = containerHeight - chromeAbovePull - footerChrome;
  return Math.max(0, expandable);
}
