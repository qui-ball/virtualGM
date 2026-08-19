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
import {
  toCharacterView,
  type CharacterView,
  type StatEntryView,
} from '@/lib/play/characterView';
import { isPendingLevelUp, xpToReachLevel } from '@/lib/play/xp';
import type { PortraitGender } from '@/lib/play/portraitPlaceholder';
import type { CharacterState } from '@/types';

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
  completed?: boolean;
  endReason?: 'fallen' | 'completed' | 'ended' | null;
  pendingLevelUp?: boolean;
  recommendedPlayers: number;
  levelMin: number;
  levelMax: number;
  avgLevel?: number;
  soloMode: boolean;
  campaignTemplateSlug?: string;
  sessionId?: string;
  characterId?: string;
  gender: PortraitGender;
  character: CharacterState | null;
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

export function portraitGenderFromCampaign(
  campaign: Pick<CampaignListItem, 'gender'>,
): PortraitGender {
  return campaign.gender === 'female' ? 'female' : 'male';
}

/**
 * Build lobby CharacterView from a playthrough list item.
 * Prefers the full PC snapshot when the API included one.
 */
export function characterViewFromListItem(
  campaign: CampaignListItem,
): CharacterView {
  if (campaign.character) {
    return toCharacterView(campaign.character);
  }
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

export type CharacterRosterStatus =
  | 'active'
  | 'fallen'
  | 'completed'
  | 'ended';

export type CharacterInactiveLabel = 'Fallen' | 'Completed' | 'Ended';

/** Playthrough still in progress (Campaigns tab). */
export function isActiveCampaign(
  campaign: Pick<CampaignListItem, 'completed'>,
): boolean {
  return !campaign.completed;
}

/**
 * Hero currently adventuring: incomplete campaign and still alive.
 * Completed runs and fallen PCs are listed as inactive.
 */
export function isActiveCharacter(
  campaign: Pick<CampaignListItem, 'completed' | 'hp' | 'endReason'>,
): boolean {
  return characterRosterStatus(campaign) === 'active';
}

export function characterRosterStatus(
  campaign: Pick<CampaignListItem, 'completed' | 'hp' | 'endReason'>,
): CharacterRosterStatus {
  if (campaign.endReason === 'fallen') return 'fallen';
  if (campaign.endReason === 'completed') return 'completed';
  if (campaign.endReason === 'ended') return 'ended';
  if (campaign.hp <= 0) return 'fallen';
  if (campaign.completed) return 'ended';
  return 'active';
}

export function characterInactiveLabel(
  campaign: Pick<CampaignListItem, 'completed' | 'hp' | 'endReason'>,
): CharacterInactiveLabel {
  const status = characterRosterStatus(campaign);
  if (status === 'fallen') return 'Fallen';
  if (status === 'completed') return 'Completed';
  return 'Ended';
}

/** Archived playthroughs can be removed from the roster. */
export function canDeleteInactiveCharacter(
  campaign: Pick<CampaignListItem, 'completed'>,
): boolean {
  return Boolean(campaign.completed);
}

export function partitionCharacterRoster(campaigns: CampaignListItem[]): {
  active: CampaignListItem[];
  inactive: CampaignListItem[];
} {
  const active: CampaignListItem[] = [];
  const inactive: CampaignListItem[] = [];
  for (const c of campaigns) {
    if (isActiveCharacter(c)) active.push(c);
    else inactive.push(c);
  }
  return { active, inactive };
}

export function activeCampaigns(
  campaigns: CampaignListItem[],
): CampaignListItem[] {
  return campaigns.filter(isActiveCampaign);
}
