import { describe, expect, it } from 'vitest';
import {
  clampPullOffset,
  computeFullPullMax,
  computePullHeights,
  computeReleasePull,
  shouldSnapSheetOpen,
  shouldSnapSheetOpenFromPull,
} from '@/lib/play/pullSheet';
import { PHASE1_MAX } from '@/lib/play/sessionConstants';

const CONFIG = { phase1Max: PHASE1_MAX, fullPullMax: 470 };

describe('clampPullOffset', () => {
  it('returns drag delta from closed, capped at full pull', () => {
    expect(clampPullOffset(false, 200, CONFIG.fullPullMax)).toBe(200);
    expect(clampPullOffset(false, 500, CONFIG.fullPullMax)).toBe(
      CONFIG.fullPullMax,
    );
    expect(clampPullOffset(false, -50, CONFIG.fullPullMax)).toBe(0);
  });

  it('returns drag delta from open, capped at closed', () => {
    expect(clampPullOffset(true, -200, CONFIG.fullPullMax)).toBe(-200);
    expect(clampPullOffset(true, -500, CONFIG.fullPullMax)).toBe(
      -CONFIG.fullPullMax,
    );
    expect(clampPullOffset(true, 50, CONFIG.fullPullMax)).toBe(0);
  });
});

describe('computePullHeights', () => {
  it('is fully closed when sheet is closed and not dragging', () => {
    const h = computePullHeights(false, false, 0, CONFIG);
    expect(h).toEqual({
      renderPull: 0,
      topH: 0,
      botH: 0,
      openness: 0,
    });
  });

  it('splits pull across phase 1 and phase 2 at full open', () => {
    const h = computePullHeights(true, false, 0, CONFIG);
    expect(h.renderPull).toBe(CONFIG.fullPullMax);
    expect(h.topH).toBe(PHASE1_MAX);
    expect(h.botH).toBe(CONFIG.fullPullMax - PHASE1_MAX);
    expect(h.openness).toBe(1);
  });

  it('interpolates during drag', () => {
    const h = computePullHeights(false, true, 45, CONFIG);
    expect(h.renderPull).toBe(45);
    expect(h.topH).toBe(45);
    expect(h.botH).toBe(0);
    expect(h.openness).toBeCloseTo(45 / CONFIG.fullPullMax);
  });
});

describe('computeFullPullMax', () => {
  it('fills space between chrome and footer', () => {
    expect(computeFullPullMax(700, 200, 100)).toBe(400);
  });

  it('never exceeds available height on small viewports', () => {
    expect(computeFullPullMax(500, 180, 120)).toBe(200);
  });
});

describe('shouldSnapSheetOpen', () => {
  it('opens when finger is below container midpoint', () => {
    expect(shouldSnapSheetOpen(450, 100, 600)).toBe(true);
  });

  it('closes when finger is above container midpoint', () => {
    expect(shouldSnapSheetOpen(200, 100, 600)).toBe(false);
  });
});

describe('computeReleasePull', () => {
  it('returns clamped pull from closed drag', () => {
    expect(computeReleasePull(false, 120, CONFIG.fullPullMax)).toBe(120);
  });

  it('returns clamped pull from open drag', () => {
    expect(computeReleasePull(true, -100, CONFIG.fullPullMax)).toBe(
      CONFIG.fullPullMax - 100,
    );
  });
});

describe('shouldSnapSheetOpenFromPull', () => {
  it('opens when release past threshold', () => {
    expect(shouldSnapSheetOpenFromPull(250, CONFIG.fullPullMax)).toBe(true);
  });

  it('closes when release below threshold', () => {
    expect(shouldSnapSheetOpenFromPull(100, CONFIG.fullPullMax)).toBe(false);
  });

  it('respects custom threshold', () => {
    expect(shouldSnapSheetOpenFromPull(200, 400, 0.6)).toBe(false);
    expect(shouldSnapSheetOpenFromPull(250, 400, 0.6)).toBe(true);
  });
});

describe('pull sheet closed state (stat row only in phase 2)', () => {
  it('has zero sheet body height when closed', () => {
    const h = computePullHeights(false, false, 0, CONFIG);
    expect(h.botH).toBe(0);
    expect(h.topH).toBe(0);
  });

  it('reveals phase 1 before phase 2 during drag', () => {
    const mid = computePullHeights(false, true, 60, CONFIG);
    expect(mid.topH).toBe(60);
    expect(mid.botH).toBe(0);
  });
});
