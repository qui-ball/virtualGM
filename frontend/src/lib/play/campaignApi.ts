import { getCampaigns } from '@/api/client';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import {
  LOBBY_CAMPAIGNS,
  activeCampaign as fixtureActive,
  otherCampaigns as fixtureOthers,
} from '@/lib/play/campaignLobby';
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
    classShort,
    level: c.level,
    lastScene: c.last_scene,
    active: c.active,
    pendingLevelUp: c.pending_level_up,
  };
}

/** Fetch campaigns from API; fall back to fixtures when offline (G9). */
export async function fetchCampaignList(): Promise<{
  active: CampaignListItem;
  others: CampaignListItem[];
}> {
  try {
    const res = await getCampaigns();
    const active =
      res.campaigns.find((c) => c.active) ?? res.campaigns[0];
    if (!active) {
      return { active: fixtureActive(), others: fixtureOthers() };
    }
    const others = res.campaigns.filter((c) => c.id !== active.id);
    return {
      active: summaryToListItem(active),
      others: others.map(summaryToListItem),
    };
  } catch {
    return { active: fixtureActive(), others: fixtureOthers() };
  }
}

/** Full list for tests and fallback. */
export function campaignsFromApiOrFixture(
  summaries: CampaignSummary[] | null,
): CampaignListItem[] {
  if (!summaries?.length) {
    return LOBBY_CAMPAIGNS;
  }
  return summaries.map(summaryToListItem);
}
