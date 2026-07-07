import { describe, expect, it } from 'vitest';
import {
  campaignAvgLevel,
  formatCampaignAudience,
  parseRecommendedPlayersParam,
  parseSoloModeParam,
} from '@/lib/play/campaignMeta';

describe('campaignMeta', () => {
  it('formats audience line with explicit avg level', () => {
    expect(
      formatCampaignAudience({
        recommendedPlayers: 4,
        levelMin: 1,
        levelMax: 5,
        avgLevel: 3,
      }),
    ).toBe('4 players · Lv 1–5 (avg 3)');
  });

  it('derives avg level from min and max', () => {
    expect(
      campaignAvgLevel({ recommendedPlayers: 2, levelMin: 1, levelMax: 4 }),
    ).toBe(3);
  });

  it('parses solo mode query param', () => {
    expect(parseSoloModeParam(null)).toBeUndefined();
    expect(parseSoloModeParam('1')).toBe(true);
    expect(parseSoloModeParam('0')).toBe(false);
    expect(parseSoloModeParam('true')).toBe(true);
    expect(parseSoloModeParam('false')).toBe(false);
  });

  it('parses recommended players query param', () => {
    expect(parseRecommendedPlayersParam(null)).toBeUndefined();
    expect(parseRecommendedPlayersParam('4')).toBe(4);
    expect(parseRecommendedPlayersParam('3')).toBe(3);
    expect(parseRecommendedPlayersParam('0')).toBeUndefined();
  });
});
