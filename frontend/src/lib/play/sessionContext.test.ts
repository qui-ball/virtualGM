import { describe, expect, it } from 'vitest';
import { toSessionContext } from '@/lib/play/sessionContext';
import type { GameStateSnapshot } from '@/types';

describe('toSessionContext', () => {
  it('uses stub campaign metadata when game state is null', () => {
    const ctx = toSessionContext(null);
    expect(ctx.campaignTitle).toBe('Lost Mine of Phandelver');
    expect(ctx.chapter).toBe(1);
    expect(ctx.scene).toBe('Road to Phandalin');
    expect(ctx.timeCurrent).toBe(12);
    expect(ctx.timeMax).toBe(50);
  });

  it('reads API chapter, scene, and time fields', () => {
    const gs: GameStateSnapshot = {
      character: null,
      enemies: {},
      countdowns: {},
      in_combat: false,
      campaign_title: 'Sunless Citadel',
      chapter: 2,
      scene_label: 'Grove of Ash',
      time_current: 28,
      time_max: 50,
    };
    const ctx = toSessionContext(gs);
    expect(ctx.campaignTitle).toBe('Sunless Citadel');
    expect(ctx.chapter).toBe(2);
    expect(ctx.scene).toBe('Grove of Ash');
    expect(ctx.timeCurrent).toBe(28);
  });

  it('falls back to combat scene label when only in_combat set', () => {
    const ctx = toSessionContext({
      character: null,
      enemies: {},
      countdowns: {},
      in_combat: true,
    });
    expect(ctx.scene).toBe('Combat');
  });
});
