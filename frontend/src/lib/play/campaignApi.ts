import { getCampaigns } from '@/api/client';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import type { CampaignSummary } from '@/types';

function summaryToListItem(c: CampaignSummary): CampaignListItem {
  const classShort =
    c.character_class.length > 0
      ? c.character_class.charAt(0).toUpperCase() +
        c.character_class.slice(1)
      : '';
  return {
    id: c.id,
    title: c.name,
    chapter: c.chapter,
    timeCurrent: c.time_current,
    timeMax: c.time_max,
    characterName: c.character_name,
    characterClass: c.character_class,
    classShort,
    level: c.level,
    lastScene: c.last_scene,
    active: c.active,
    completed: Boolean(c.completed),
    endReason:
      c.end_reason === 'fallen' ||
      c.end_reason === 'completed' ||
      c.end_reason === 'ended'
        ? c.end_reason
        : null,
    pendingLevelUp: c.pending_level_up,
    recommendedPlayers: c.recommended_players ?? 4,
    levelMin: c.level_min ?? 1,
    levelMax: c.level_max ?? 5,
    avgLevel: c.avg_level ?? undefined,
    soloMode: c.solo_mode ?? false,
    campaignTemplateSlug: c.campaign_template_slug ?? undefined,
    sessionId: c.session_id ?? undefined,
    characterId: c.character_id ?? undefined,
    gender: c.gender === 'female' ? 'female' : 'male',
    character: c.character ?? null,
    xp: c.xp ?? 0,
    hp: c.hp ?? 1,
    hpMax: c.hp_max ?? 1,
    mana: c.mana ?? null,
    manaMax: c.mana_max ?? null,
    evasion: c.evasion ?? 10,
    finesse: c.finesse ?? 0,
  };
}

export type FetchCampaignListResult = {
  campaigns: CampaignListItem[];
  error: string | null;
};

/** Fetch playthroughs from API. Empty list when none — never invent fixture campaigns. */
export async function fetchCampaignList(): Promise<FetchCampaignListResult> {
  try {
    const res = await getCampaigns();
    return {
      campaigns: res.campaigns.map(summaryToListItem),
      error: null,
    };
  } catch (err) {
    return {
      campaigns: [],
      error:
        err instanceof Error ? err.message : 'Failed to load campaigns',
    };
  }
}

/** Map API summaries; empty/null → empty list (no fixture fallback). */
export function campaignsFromApi(
  summaries: CampaignSummary[] | null,
): CampaignListItem[] {
  if (!summaries?.length) {
    return [];
  }
  return summaries.map(summaryToListItem);
}
