import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCampaigns } from '@/api/client';
import {
  campaignsFromApiOrFixture,
  fetchCampaignList,
} from '@/lib/play/campaignApi';
import { LOBBY_CAMPAIGNS } from '@/lib/play/campaignLobby';
import type { CampaignSummary } from '@/types';

vi.mock('@/api/client', () => ({
  getCampaigns: vi.fn(),
}));

const API_CAMPAIGNS: CampaignSummary[] = [
  {
    id: 'lost-mine',
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
  },
  {
    id: 'sunless-citadel',
    name: 'The Sunless Citadel',
    chapter: 1,
    time_current: 5,
    time_max: 50,
    last_scene: 'Grove',
    character_name: 'Zaelan',
    character_class: 'mage',
    level: 4,
    pending_level_up: true,
    active: false,
  },
];

describe('campaignApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCampaignList maps API campaigns to lobby items', async () => {
    vi.mocked(getCampaigns).mockResolvedValue({ campaigns: API_CAMPAIGNS });

    const { active, others } = await fetchCampaignList();

    expect(active.id).toBe('lost-mine');
    expect(active.title).toBe('Lost Mine of Phandelver');
    expect(active.characterClass).toBe('warrior');
    expect(active.classShort).toBe('Warrior');
    expect(active.timeCurrent).toBe(20);
    expect(others).toHaveLength(1);
    expect(others[0]?.id).toBe('sunless-citadel');
    expect(others[0]?.pendingLevelUp).toBe(true);
  });

  it('fetchCampaignList falls back to fixtures when API fails', async () => {
    vi.mocked(getCampaigns).mockRejectedValue(new Error('offline'));

    const { active, others } = await fetchCampaignList();

    expect(active.id).toBe('lost-mine');
    expect(others.length).toBeGreaterThan(0);
  });

  it('campaignsFromApiOrFixture returns fixtures when summaries empty', () => {
    expect(campaignsFromApiOrFixture(null)).toEqual(LOBBY_CAMPAIGNS);
    expect(campaignsFromApiOrFixture([])).toEqual(LOBBY_CAMPAIGNS);
  });

  it('campaignsFromApiOrFixture maps summaries', () => {
    const list = campaignsFromApiOrFixture([API_CAMPAIGNS[1]!]);
    expect(list).toHaveLength(1);
    expect(list[0]?.characterName).toBe('Zaelan');
    expect(list[0]?.characterClass).toBe('mage');
  });
});
