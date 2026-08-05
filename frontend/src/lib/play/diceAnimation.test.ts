import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildForcedNotation,
  DICE_ANIMATION_TIMEOUT_MS,
  playDiceAnimation,
  registerDiceAnimationPlayer,
  shouldSkipDiceAnimation,
} from '@/lib/play/diceAnimation';

vi.mock('@/lib/a11y/motion', () => ({
  prefersReducedMotion: vi.fn(() => false),
}));

import { prefersReducedMotion } from '@/lib/a11y/motion';

const prefersReducedMotionMock = vi.mocked(prefersReducedMotion);

describe('buildForcedNotation', () => {
  it('builds single-die notation', () => {
    expect(buildForcedNotation({ diceType: 'd20', rolls: [17] })).toBe(
      '1d20@17',
    );
  });

  it('builds advantage two-die notation', () => {
    expect(buildForcedNotation({ diceType: 'd20', rolls: [17, 3] })).toBe(
      '2d20@17,3',
    );
  });

  it('builds multi-die notation', () => {
    expect(buildForcedNotation({ diceType: 'd6', rolls: [4, 2, 5] })).toBe(
      '3d6@4,2,5',
    );
  });

  it('rejects empty rolls', () => {
    expect(buildForcedNotation({ diceType: 'd20', rolls: [] })).toBeNull();
  });

  it('rejects out-of-range faces', () => {
    expect(buildForcedNotation({ diceType: 'd6', rolls: [7] })).toBeNull();
    expect(buildForcedNotation({ diceType: 'd20', rolls: [0] })).toBeNull();
  });
});

describe('shouldSkipDiceAnimation', () => {
  beforeEach(() => {
    prefersReducedMotionMock.mockReturnValue(false);
  });

  it('skips when reduced motion is preferred', () => {
    prefersReducedMotionMock.mockReturnValue(true);
    expect(
      shouldSkipDiceAnimation({ diceType: 'd20', rolls: [10] }),
    ).toBe(true);
  });

  it('skips d100 (library tens-die mismatch)', () => {
    expect(
      shouldSkipDiceAnimation({ diceType: 'd100', rolls: [73] }),
    ).toBe(true);
  });

  it('does not skip a normal d20', () => {
    expect(
      shouldSkipDiceAnimation({ diceType: 'd20', rolls: [12] }),
    ).toBe(false);
  });
});

describe('playDiceAnimation', () => {
  afterEach(() => {
    registerDiceAnimationPlayer(null);
    prefersReducedMotionMock.mockReturnValue(false);
  });

  it('no-ops when no player is registered', async () => {
    await expect(
      playDiceAnimation({ diceType: 'd20', rolls: [5] }),
    ).resolves.toBeUndefined();
  });

  it('calls the registered player with forced notation', async () => {
    const play = vi.fn(async () => undefined);
    registerDiceAnimationPlayer(play);
    await playDiceAnimation({ diceType: 'd6', rolls: [2, 4] });
    expect(play).toHaveBeenCalledWith('2d6@2,4');
  });

  it('swallows player errors', async () => {
    registerDiceAnimationPlayer(() =>
      Promise.reject(new Error('webgl boom')),
    );
    await expect(
      playDiceAnimation({ diceType: 'd20', rolls: [1] }),
    ).resolves.toBeUndefined();
  });

  it('times out a hung player', async () => {
    vi.useFakeTimers();
    try {
      registerDiceAnimationPlayer(
        () => new Promise(() => undefined),
      );
      const pending = playDiceAnimation({ diceType: 'd20', rolls: [8] });
      await vi.advanceTimersByTimeAsync(DICE_ANIMATION_TIMEOUT_MS);
      await expect(pending).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
