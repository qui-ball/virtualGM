import { describe, expect, it } from 'vitest';
import { toSessionContext } from '@/lib/play/sessionContext';

describe('toSessionContext', () => {
  it('uses stub campaign metadata when game state is null', () => {
    const ctx = toSessionContext(null);
    expect(ctx.campaignTitle).toBe('Lost Mine of Phandelver');
    expect(ctx.chapter).toBe(1);
    expect(ctx.scene).toBe('Road to Phandalin');
    expect(ctx.timeCurrent).toBe(12);
    expect(ctx.timeMax).toBe(50);
  });

  it('uses combat scene label when in combat', () => {
    const ctx = toSessionContext({
      character: null,
      enemies: {},
      countdowns: {},
      in_combat: true,
    });
    expect(ctx.scene).toBe('Combat');
  });

  it('reads time from first countdown value', () => {
    const ctx = toSessionContext({
      character: null,
      enemies: {},
      countdowns: { scene: 37, other: 5 },
      in_combat: false,
    });
    expect(ctx.timeCurrent).toBe(37);
  });
});
