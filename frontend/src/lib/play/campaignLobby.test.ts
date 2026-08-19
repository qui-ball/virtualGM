import { describe, expect, it } from 'vitest';
import {
  characterInactiveLabel,
  characterRosterStatus,
  characterViewFromListItem,
  canDeleteInactiveCharacter,
  isActiveCharacter,
  monogramFromName,
  partitionCharacterRoster,
  playSearchParamsFromCampaign,
  portraitGenderFromCampaign,
  type CampaignListItem,
} from '@/lib/play/campaignLobby';
import { DEMO_CHARACTER } from '@/lib/play/characterView';

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
  gender: 'female',
  character: null,
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

  it('portraitGenderFromCampaign defaults to male', () => {
    expect(portraitGenderFromCampaign(SAMPLE)).toBe('female');
    expect(
      portraitGenderFromCampaign({ ...SAMPLE, gender: 'male' }),
    ).toBe('male');
  });

  it('characterViewFromListItem prefers the PC snapshot when present', () => {
    const view = characterViewFromListItem({
      ...SAMPLE,
      character: DEMO_CHARACTER,
    });
    expect(view.name).toBe(DEMO_CHARACTER.name);
    expect(view.hp).toBe(DEMO_CHARACTER.hp);
    expect(view.inventory).toEqual(DEMO_CHARACTER.inventory);
    expect(view.stats.find((s) => s.key === 'wit')?.mod).toBe(2);
  });
  it('playSearchParamsFromCampaign includes resume ids', () => {
    const qs = playSearchParamsFromCampaign(SAMPLE);
    const params = new URLSearchParams(qs);
    expect(params.get('activeCampaignId')).toBe('pt-1');
    expect(params.get('sessionId')).toBe('sess-9');
    expect(params.get('characterName')).toBe('Nyx Frost');
    expect(params.get('soloMode')).toBe('1');
  });

  it('partitionCharacterRoster lists inactive heroes below active', () => {
    const completed: CampaignListItem = {
      ...SAMPLE,
      id: 'pt-done',
      characterName: 'Vespera',
      completed: true,
      endReason: 'completed',
    };
    const ended: CampaignListItem = {
      ...SAMPLE,
      id: 'pt-ended',
      characterName: 'Aldric',
      completed: true,
      endReason: 'ended',
    };
    const fallen: CampaignListItem = {
      ...SAMPLE,
      id: 'pt-dead',
      characterName: 'Kael',
      hp: 0,
      completed: true,
      endReason: 'fallen',
    };
    const { active, inactive } = partitionCharacterRoster([
      fallen,
      SAMPLE,
      completed,
      ended,
    ]);
    expect(active.map((c) => c.id)).toEqual(['pt-1']);
    expect(inactive.map((c) => c.id)).toEqual([
      'pt-dead',
      'pt-done',
      'pt-ended',
    ]);
    expect(isActiveCharacter(SAMPLE)).toBe(true);
    expect(characterRosterStatus(completed)).toBe('completed');
    expect(characterInactiveLabel(completed)).toBe('Completed');
    expect(characterRosterStatus(ended)).toBe('ended');
    expect(characterInactiveLabel(ended)).toBe('Ended');
    expect(characterRosterStatus(fallen)).toBe('fallen');
    expect(characterInactiveLabel(fallen)).toBe('Fallen');
    expect(canDeleteInactiveCharacter(completed)).toBe(true);
    expect(canDeleteInactiveCharacter(ended)).toBe(true);
    expect(canDeleteInactiveCharacter(fallen)).toBe(true);
    expect(canDeleteInactiveCharacter(SAMPLE)).toBe(false);
  });
});
