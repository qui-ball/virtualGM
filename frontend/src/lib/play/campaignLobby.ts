/**
 * Campaign lobby types + playthrough → character view helpers (WS-5).
 * Playthrough list comes from GET /campaigns via campaignApi — no fixtures.
 */

import {
  formatClassLabel,
  formatSignedModifier,
  isCaster,
  type StatKey,
} from '@/lib/play/stats';
import { statDisplayLabel } from '@/lib/play/statLabels';
import { soloModeToParam } from '@/lib/play/campaignMeta';
import type { CharacterView, StatEntryView } from '@/lib/play/characterView';
import { isPendingLevelUp, xpToReachLevel } from '@/lib/play/xp';

export type CampaignListItem = {
  id: string;
  title: string;
  chapter: number;
  timeCurrent: number;
  timeMax: number;
  characterName: string;
  characterClass: string;
  classShort: string;
  level: number;
  lastScene: string;
  active?: boolean;
  pendingLevelUp?: boolean;
  recommendedPlayers: number;
  levelMin: number;
  levelMax: number;
  avgLevel?: number;
  soloMode: boolean;
  campaignTemplateSlug?: string;
  sessionId?: string;
  characterId?: string;
  /** Lobby vitals from GET /campaigns PC snapshot. */
  xp: number;
  hp: number;
  hpMax: number;
  mana: number | null;
  manaMax: number | null;
  evasion: number;
  finesse: number;
};

const STAT_KEYS: StatKey[] = ['might', 'finesse', 'wit', 'presence'];

function emptyStatEntries(finesse: number): StatEntryView[] {
  return STAT_KEYS.map((key) => {
    const mod = key === 'finesse' ? finesse : 0;
    const short = key.slice(0, 3).toUpperCase();
    const label = statDisplayLabel(key);
    return {
      key,
      short,
      label,
      mod,
      signed: formatSignedModifier(mod),
      ariaLabel: `${label} ${formatSignedModifier(mod)}`,
    };
  });
}

export function monogramFromName(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}

/**
 * Build lobby CharacterView from a playthrough list item.
 * Full sheet stats are not required for lobby cards.
 */
export function characterViewFromListItem(
  campaign: CampaignListItem,
): CharacterView {
  const showMana = isCaster(campaign.characterClass);
  const xpNext = xpToReachLevel(campaign.level + 1);
  return {
    name: campaign.characterName,
    classLabel: formatClassLabel(campaign.characterClass),
    level: campaign.level,
    xp: campaign.xp,
    xpNext,
    pendingLevelUp:
      campaign.pendingLevelUp ??
      isPendingLevelUp(campaign.xp, campaign.level),
    stats: emptyStatEntries(campaign.finesse),
    hp: campaign.hp,
    hpMax: campaign.hpMax,
    mana: campaign.mana,
    manaMax: campaign.manaMax,
    evasion: campaign.evasion,
    initiativeMod: campaign.finesse,
    showMana,
    conditions: [],
    gold: 0,
    coins: [],
    inventory: [],
    classAbilities: [],
    spellsKnown: [],
  };
}

/** Search params for /play resume from a lobby playthrough. */
export function playSearchParamsFromCampaign(
  campaign: CampaignListItem,
): string {
  const params = new URLSearchParams({
    campaignId: campaign.id,
    activeCampaignId: campaign.id,
    soloMode: soloModeToParam(campaign.soloMode),
    recommendedPlayers: String(campaign.recommendedPlayers),
  });
  if (campaign.characterName) {
    params.set('characterName', campaign.characterName);
  }
  if (campaign.campaignTemplateSlug) {
    params.set('templateSlug', campaign.campaignTemplateSlug);
  }
  if (campaign.sessionId) {
    params.set('sessionId', campaign.sessionId);
  }
  return params.toString();
}
