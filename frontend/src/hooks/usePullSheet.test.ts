import { describe, expect, it } from 'vitest';
import {
  clampPullOffset,
  computeFullPullMax,
  computePullHeights,
  computeReleasePull,
  shouldSnapSheetOpenFromPull,
} from '@/lib/play/pullSheet';
import { buildSessionMainPullMeasure } from '@/lib/play/sessionPullLayout';
import { PHASE1_MAX } from '@/lib/play/sessionConstants';

const CHROME = { appBar: 72, vitalStrip: 56, pullHandle: 28, composer: 68 };
const MAIN_H = 544;

function mainConfig() {
  const { chromeAbovePull, footerChrome } = buildSessionMainPullMeasure(CHROME);
  const fullPullMax = computeFullPullMax(
    MAIN_H,
    chromeAbovePull,
    footerChrome,
  );
  return { phase1Max: PHASE1_MAX, fullPullMax };
}

/** Simulates usePullSheet open/close from drag release (same math as the hook). */
function snapAfterDrag(
  startOpen: boolean,
  dy: number,
  config: ReturnType<typeof mainConfig>,
): boolean {
  const delta = clampPullOffset(startOpen, dy, config.fullPullMax);
  const release = computeReleasePull(startOpen, delta, config.fullPullMax);
  return shouldSnapSheetOpenFromPull(release, config.fullPullMax);
}

describe('usePullSheet drag behavior (session-main model)', () => {
  const config = mainConfig();

  it('measures fullPullMax from session-main only', () => {
    expect(config.fullPullMax).toBe(MAIN_H - 72 - 56 - 28);
  });

  it('snap-opens when pulling down from closed', () => {
    expect(snapAfterDrag(false, 220, config)).toBe(true);
    const h = computePullHeights(true, false, 0, config);
    expect(h.topH).toBe(PHASE1_MAX);
    expect(h.botH).toBeGreaterThan(100);
  });

  it('snap-closes when pulling up from open', () => {
    expect(snapAfterDrag(true, -300, config)).toBe(false);
    expect(computePullHeights(false, false, 0, config).renderPull).toBe(0);
  });

  it('interpolates heights while dragging closed', () => {
    const h = computePullHeights(false, true, 45, config);
    expect(h.topH).toBe(45);
    expect(h.botH).toBe(0);
  });
});
