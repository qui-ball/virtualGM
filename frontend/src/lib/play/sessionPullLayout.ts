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

export function buildSessionPullMeasure(heights: SessionChromeHeights): {
  chromeAbovePull: number;
  footerChrome: number;
} {
  return {
    chromeAbovePull:
      heights.appBar + heights.vitalStrip + heights.pullHandle,
    footerChrome: heights.composer,
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

/** Total fixed chrome when sheet is fully open (story flex area may be 0). */
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
