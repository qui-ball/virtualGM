import { describe, expect, it } from 'vitest';
import {
  activeCampaign,
  findLobbyCharacter,
  getDefaultLobbyCharacterId,
  LOBBY_CAMPAIGNS,
  LOBBY_CHARACTERS,
  otherCampaigns,
} from '@/lib/play/campaignLobby';
import { isPendingLevelUp } from '@/lib/play/xp';

describe('campaign lobby fixtures', () => {
  it('has exactly one active campaign', () => {
    const active = LOBBY_CAMPAIGNS.filter((c) => c.active);
    expect(active).toHaveLength(1);
    expect(activeCampaign().id).toBe('lost-mine');
  });

  it('lists inactive campaigns separately', () => {
    const others = otherCampaigns();
    expect(others).toHaveLength(2);
    expect(others.every((c) => !c.active)).toBe(true);
  });

  it('marks Ribcage Coast pending level-up', () => {
    const ribcage = LOBBY_CAMPAIGNS.find((c) => c.id === 'ribcage-coast');
    expect(ribcage?.pendingLevelUp).toBe(true);
    const wren = findLobbyCharacter('wren');
    expect(wren).toBeDefined();
    expect(isPendingLevelUp(wren!.state.xp, wren!.state.level)).toBe(true);
  });

  it('defaults to Aldric as active lobby character', () => {
    expect(getDefaultLobbyCharacterId()).toBe('aldric-of-corlinn-hill');
    expect(LOBBY_CHARACTERS.length).toBeGreaterThanOrEqual(4);
  });
});
