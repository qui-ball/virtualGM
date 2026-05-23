import {
  computeFullPullMax,
  computePullHeights,
  type PullSheetConfig,
} from '@/lib/play/pullSheet';
import { PHASE1_MAX } from '@/lib/play/sessionConstants';

/** Measured chrome heights for pull-sheet layout (matches SessionLayout refs). */
export type SessionChromeHeights = {
  appBar: number;
  vitalStrip: number;
  pullHandle: number;
  composer: number;
};

/**
 * Pull sheet lives in `session-main` (grid row above the pinned footer).
 * Composer height is excluded — it is not a child of the main column.
 */
export function buildSessionMainPullMeasure(heights: SessionChromeHeights): {
  chromeAbovePull: number;
  footerChrome: number;
} {
  return {
    chromeAbovePull:
      heights.appBar + heights.vitalStrip + heights.pullHandle,
    footerChrome: 0,
  };
}

/** @deprecated Use buildSessionMainPullMeasure — full root including footer. */
export function buildSessionPullMeasure(heights: SessionChromeHeights): {
  chromeAbovePull: number;
  footerChrome: number;
} {
  return {
    chromeAbovePull: heights.appBar + heights.vitalStrip,
    footerChrome: heights.pullHandle + heights.composer,
  };
}

export function sessionMainPullConfig(
  mainHeight: number,
  chrome: SessionChromeHeights,
): PullSheetConfig {
  const { chromeAbovePull, footerChrome } = buildSessionMainPullMeasure(chrome);
  return {
    phase1Max: PHASE1_MAX,
    fullPullMax: computeFullPullMax(
      mainHeight,
      chromeAbovePull,
      footerChrome,
    ),
  };
}

export function sessionPullConfig(
  containerHeight: number,
  chrome: SessionChromeHeights,
): PullSheetConfig {
  const { chromeAbovePull, footerChrome } = buildSessionPullMeasure(chrome);
  return {
    phase1Max: PHASE1_MAX,
    fullPullMax: computeFullPullMax(
      containerHeight,
      chromeAbovePull,
      footerChrome,
    ),
  };
}

/** Total fixed chrome in session-main when sheet is fully open. */
export function sessionMainFixedChromeWhenOpen(
  mainHeight: number,
  chrome: SessionChromeHeights,
): {
  config: PullSheetConfig;
  topH: number;
  botH: number;
  totalHeight: number;
} {
  const config = sessionMainPullConfig(mainHeight, chrome);
  const { topH, botH } = computePullHeights(true, false, 0, config);
  const totalHeight =
    chrome.appBar + topH + chrome.vitalStrip + botH + chrome.pullHandle;
  return { config, topH, botH, totalHeight };
}

/** @deprecated Root-level model including footer — prefer sessionMainFixedChromeWhenOpen. */
export function sessionFixedChromeWhenOpen(
  containerHeight: number,
  chrome: SessionChromeHeights,
): {
  config: PullSheetConfig;
  topH: number;
  botH: number;
  totalHeight: number;
} {
  const config = sessionPullConfig(containerHeight, chrome);
  const { topH, botH } = computePullHeights(true, false, 0, config);
  const totalHeight =
    chrome.appBar +
    topH +
    chrome.vitalStrip +
    botH +
    chrome.pullHandle +
    chrome.composer;
  return { config, topH, botH, totalHeight };
}
