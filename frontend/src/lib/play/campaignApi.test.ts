import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCampaigns } from '@/api/client';
import {
  campaignsFromApi,
  fetchCampaignList,
} from '@/lib/play/campaignApi';
import type { CampaignSummary } from '@/types';

vi.mock('@/api/client', () => ({
  getCampaigns: vi.fn(),
}));

const API_CAMPAIGNS: CampaignSummary[] = [
  {
    id: 'pt-1',
    name: 'Lost Mine of Phandelver',
    chapter: 2,
    time_current: 20,
    time_max: 50,
    last_scene: 'Cragmaw hideout',
    character_name: 'Aldric of Corlinn Hill',
    character_class: 'warrior',
    level: 2,
    pending_level_up: false,
    active: true,
    recommended_players: 4,
    level_min: 1,
    level_max: 5,
    avg_level: 3,
    solo_mode: true,
    campaign_template_slug: 'fantasy-lost-mine',
    session_id: 'sess-1',
    gender: 'male',
    xp: 80,
    hp: 14,
    hp_max: 14,
    mana: null,
    mana_max: null,
    evasion: 14,
    finesse: 1,
  },
  {
    id: 'pt-2',
    name: 'Touch of the Necromancer',
    chapter: 1,
    time_current: 35,
    time_max: 35,
    last_scene: 'Shrine',
    character_name: 'Vespera Greythorn',
    character_class: 'mage',
    level: 1,
    pending_level_up: false,
    active: false,
    recommended_players: 1,
    level_min: 1,
    level_max: 3,
    avg_level: 2,
    solo_mode: false,
    gender: 'female',
    completed: true,
    end_reason: 'ended',
    xp: 0,
    hp: 8,
    hp_max: 8,
    mana: 7,
    mana_max: 7,
    evasion: 11,
    finesse: 0,
  },
];

describe('campaignApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCampaignList maps API campaigns to lobby items', async () => {
    vi.mocked(getCampaigns).mockResolvedValue({ campaigns: API_CAMPAIGNS });

    const { campaigns, error } = await fetchCampaignList();

    expect(error).toBeNull();
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0]?.id).toBe('pt-1');
    expect(campaigns[0]?.title).toBe('Lost Mine of Phandelver');
    expect(campaigns[0]?.soloMode).toBe(true);
    expect(campaigns[0]?.hp).toBe(14);
    expect(campaigns[0]?.hpMax).toBe(14);
    expect(campaigns[0]?.xp).toBe(80);
    expect(campaigns[0]?.gender).toBe('male');
    expect(campaigns[0]?.completed).toBe(false);
    expect(campaigns[1]?.id).toBe('pt-2');
    expect(campaigns[1]?.mana).toBe(7);
    expect(campaigns[1]?.gender).toBe('female');
    expect(campaigns[1]?.completed).toBe(true);
    expect(campaigns[1]?.endReason).toBe('ended');
  });

  it('fetchCampaignList returns empty when API has no playthroughs', async () => {
    vi.mocked(getCampaigns).mockResolvedValue({ campaigns: [] });

    const { campaigns, error } = await fetchCampaignList();

    expect(error).toBeNull();
    expect(campaigns).toEqual([]);
  });

  it('fetchCampaignList returns error when API fails', async () => {
    vi.mocked(getCampaigns).mockRejectedValue(new Error('offline'));

    const { campaigns, error } = await fetchCampaignList();

    expect(campaigns).toEqual([]);
    expect(error).toBe('offline');
  });

  it('campaignsFromApi returns empty when summaries empty', () => {
    expect(campaignsFromApi(null)).toEqual([]);
    expect(campaignsFromApi([])).toEqual([]);
  });

  it('campaignsFromApi maps summaries', () => {
    const list = campaignsFromApi([API_CAMPAIGNS[1]!]);
    expect(list).toHaveLength(1);
    expect(list[0]?.characterName).toBe('Vespera Greythorn');
  });
});
