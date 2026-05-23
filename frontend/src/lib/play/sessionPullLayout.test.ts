import { describe, expect, it } from 'vitest';
import {
  buildSessionMainPullMeasure,
  sessionMainFixedChromeWhenOpen,
  sessionMainPullConfig,
} from '@/lib/play/sessionPullLayout';
import {
  clampPullOffset,
  computePullHeights,
  computeReleasePull,
  shouldSnapSheetOpenFromPull,
} from '@/lib/play/pullSheet';
import { PHASE1_MAX } from '@/lib/play/sessionConstants';

const PHONE_CHROME = {
  appBar: 72,
  vitalStrip: 56,
  pullHandle: 28,
  composer: 68,
};

/** session-main height when viewport is 640px with pinned footer. */
const MAIN_HEIGHT = 640 - PHONE_CHROME.pullHandle - PHONE_CHROME.composer;

describe('buildSessionMainPullMeasure', () => {
  it('treats pull handle as chrome inside session-main, not composer', () => {
    expect(buildSessionMainPullMeasure(PHONE_CHROME)).toEqual({
      chromeAbovePull: 72 + 56 + 28,
      footerChrome: 0,
    });
  });
});

describe('sessionMainPullConfig', () => {
  it('full pull uses only session-main minus fixed chrome', () => {
    const { fullPullMax } = sessionMainPullConfig(MAIN_HEIGHT, PHONE_CHROME);
    expect(fullPullMax).toBe(MAIN_HEIGHT - 72 - 56 - 28);
  });

  it('never inflates past session-main on short viewports', () => {
    const main = 480 - PHONE_CHROME.pullHandle - PHONE_CHROME.composer;
    const { fullPullMax } = sessionMainPullConfig(main, PHONE_CHROME);
    expect(fullPullMax).toBe(main - 72 - 56 - 28);
    expect(fullPullMax + 72 + 56 + 28).toBe(main);
  });
});

describe('sessionMainFixedChromeWhenOpen', () => {
  it('fills session-main exactly when sheet is fully open', () => {
    const { topH, botH, totalHeight, config } = sessionMainFixedChromeWhenOpen(
      MAIN_HEIGHT,
      PHONE_CHROME,
    );
    expect(topH).toBe(PHASE1_MAX);
    expect(botH).toBe(config.fullPullMax - PHASE1_MAX);
    expect(totalHeight).toBe(MAIN_HEIGHT);
  });
});

describe('pull drag snap (session-main fullPullMax)', () => {
  const { fullPullMax } = sessionMainPullConfig(MAIN_HEIGHT, PHONE_CHROME);

  it('opens sheet when dragging down past threshold from closed', () => {
    const delta = clampPullOffset(false, 200, fullPullMax);
    const release = computeReleasePull(false, delta, fullPullMax);
    expect(shouldSnapSheetOpenFromPull(release, fullPullMax)).toBe(true);
    const h = computePullHeights(true, false, 0, {
      phase1Max: PHASE1_MAX,
      fullPullMax,
    });
    expect(h.botH).toBeGreaterThan(0);
    expect(h.topH).toBe(PHASE1_MAX);
  });

  it('closes sheet when dragging up from open', () => {
    const delta = clampPullOffset(true, -fullPullMax, fullPullMax);
    const release = computeReleasePull(true, delta, fullPullMax);
    expect(shouldSnapSheetOpenFromPull(release, fullPullMax)).toBe(false);
    const h = computePullHeights(false, false, 0, {
      phase1Max: PHASE1_MAX,
      fullPullMax,
    });
    expect(h.renderPull).toBe(0);
  });
});
