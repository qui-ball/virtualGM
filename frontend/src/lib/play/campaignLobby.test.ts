import { describe, expect, it } from 'vitest';
import {
  characterViewFromListItem,
  monogramFromName,
  playSearchParamsFromCampaign,
  type CampaignListItem,
} from '@/lib/play/campaignLobby';

const SAMPLE: CampaignListItem = {
  id: 'pt-1',
  title: 'Lost Mine of Phandelver',
  chapter: 2,
  timeCurrent: 20,
  timeMax: 50,
  characterName: 'Nyx Frost',
  characterClass: 'mage',
  classShort: 'Mage',
  level: 2,
  lastScene: 'Cragmaw',
  active: true,
  pendingLevelUp: false,
  recommendedPlayers: 4,
  levelMin: 1,
  levelMax: 5,
  avgLevel: 3,
  soloMode: true,
  campaignTemplateSlug: 'fantasy-lost-mine',
  sessionId: 'sess-9',
  xp: 120,
  hp: 14,
  hpMax: 16,
  mana: 6,
  manaMax: 7,
  evasion: 11,
  finesse: 0,
};

describe('campaignLobby helpers', () => {
  it('monogramFromName uses first letter', () => {
    expect(monogramFromName('Nyx Frost')).toBe('N');
    expect(monogramFromName('  ')).toBe('?');
  });

  it('characterViewFromListItem uses playthrough vitals only', () => {
    const view = characterViewFromListItem(SAMPLE);
    expect(view.name).toBe('Nyx Frost');
    expect(view.classLabel).toBe('Mage');
    expect(view.level).toBe(2);
    expect(view.hp).toBe(14);
    expect(view.hpMax).toBe(16);
    expect(view.mana).toBe(6);
    expect(view.showMana).toBe(true);
    expect(view.xp).toBe(120);
    expect(view.evasion).toBe(11);
  });

  it('playSearchParamsFromCampaign includes resume ids', () => {
    const qs = playSearchParamsFromCampaign(SAMPLE);
    const params = new URLSearchParams(qs);
    expect(params.get('activeCampaignId')).toBe('pt-1');
    expect(params.get('sessionId')).toBe('sess-9');
    expect(params.get('characterName')).toBe('Nyx Frost');
    expect(params.get('soloMode')).toBe('1');
  });
});
