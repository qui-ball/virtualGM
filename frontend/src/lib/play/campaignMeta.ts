/** Campaign template audience line for lobby cards. */
export type CampaignAudience = {
  recommendedPlayers: number;
  levelMin: number;
  levelMax: number;
  avgLevel?: number;
};

export function campaignAvgLevel(audience: CampaignAudience): number {
  return (
    audience.avgLevel ??
    Math.round((audience.levelMin + audience.levelMax) / 2)
  );
}

export function formatCampaignAudience(audience: CampaignAudience): string {
  const avg = campaignAvgLevel(audience);
  return `${audience.recommendedPlayers} players · Lv ${audience.levelMin}–${audience.levelMax} (avg ${avg})`;
}

/** Parse `soloMode` query param; undefined when absent (backend default applies). */
export function parseSoloModeParam(value: string | null): boolean | undefined {
  if (value == null || value === '') return undefined;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  if (value === '1' || value.toLowerCase() === 'true') return true;
  return undefined;
}

/** Parse recommended party size from query param. */
export function parseRecommendedPlayersParam(
  value: string | null,
): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
}

export function soloModeToParam(enabled: boolean): string {
  return enabled ? '1' : '0';
}
