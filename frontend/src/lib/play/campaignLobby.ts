import { toCharacterView, type CharacterView } from '@/lib/play/characterView';
import { isPendingLevelUp } from '@/lib/play/xp';
import type { CharacterState } from '@/types';

export type CampaignListItem = {
  id: string;
  title: string;
  chapter: number;
  timeCurrent: number;
  timeMax: number;
  characterName: string;
  classShort: string;
  level: number;
  lastScene: string;
  active?: boolean;
  pendingLevelUp?: boolean;
};

export type LobbyCharacterOption = {
  id: string;
  state: CharacterState;
  view: CharacterView;
  monogram: string;
};

/** Active PC aligned with backend `create_player_character`. */
const ALDRIC_STATE: CharacterState = {
  name: 'Aldric of Corlinn Hill',
  character_class: 'warrior',
  level: 1,
  xp: 0,
  stats: { might: 2, finesse: 1, wit: 0, presence: -1 },
  hp: 12,
  hp_max: 12,
  evasion: 14,
  mana: null,
  mana_max: null,
  conditions: [],
  class_abilities: ['weapon_focus'],
  spells_known: [],
  gold: 10,
  inventory: ['Longsword', 'Handaxe', 'Chain Mail', "Explorer's Pack"],
  equipped_weapon: 'Longsword',
  equipped_armor: 'Chain Mail',
};

const ZAELAN_STATE: CharacterState = {
  name: 'Zaelan',
  character_class: 'mage',
  level: 4,
  xp: 680,
  stats: { might: -1, finesse: 0, wit: 2, presence: 1 },
  hp: 18,
  hp_max: 22,
  evasion: 12,
  mana: 6,
  mana_max: 9,
  conditions: [],
  class_abilities: ['stormborn', 'arcane_reservoir'],
  spells_known: ['voltaic_lance', 'static_snare'],
  gold: 24,
  inventory: ['Healing draught', 'Spellbook'],
  equipped_weapon: 'Storm Staff',
  equipped_armor: 'Robe of Currents',
};

const WREN_STATE: CharacterState = {
  name: 'Wren',
  character_class: 'bard',
  level: 6,
  xp: 11_200,
  stats: { might: 0, finesse: 1, wit: 1, presence: 2 },
  hp: 22,
  hp_max: 30,
  evasion: 13,
  mana: 5,
  mana_max: 8,
  conditions: [],
  class_abilities: ['inspiring_presence'],
  spells_known: ['glamour_step'],
  gold: 18,
  inventory: ['Lute', 'Healing draught'],
  equipped_weapon: 'Rapier',
  equipped_armor: 'Leather coat',
};

const IOLAN_STATE: CharacterState = {
  name: 'Iolan',
  character_class: 'mage',
  level: 2,
  xp: 120,
  stats: { might: -1, finesse: 0, wit: 2, presence: 0 },
  hp: 14,
  hp_max: 16,
  evasion: 11,
  mana: 6,
  mana_max: 7,
  conditions: [],
  class_abilities: [],
  spells_known: ['ember_bolt'],
  gold: 8,
  inventory: ['Staff', 'Spellbook'],
  equipped_weapon: 'Staff',
  equipped_armor: 'Robe',
};

function monogram(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}

function toLobbyOption(state: CharacterState): LobbyCharacterOption {
  return {
    id: state.name.toLowerCase().replace(/\s+/g, '-'),
    state,
    view: toCharacterView(state),
    monogram: monogram(state.name),
  };
}

export const LOBBY_CHARACTERS: LobbyCharacterOption[] = [
  toLobbyOption(ALDRIC_STATE),
  toLobbyOption(ZAELAN_STATE),
  toLobbyOption(IOLAN_STATE),
  toLobbyOption(WREN_STATE),
];

export const LOBBY_CAMPAIGNS: CampaignListItem[] = [
  {
    id: 'lost-mine',
    title: 'Lost Mine of Phandelver',
    chapter: 1,
    timeCurrent: 12,
    timeMax: 50,
    characterName: 'Aldric of Corlinn Hill',
    classShort: 'War',
    level: 1,
    lastScene: 'Road to Phandalin',
    active: true,
  },
  {
    id: 'salt-smoke',
    title: 'Salt & Smoke',
    chapter: 1,
    timeCurrent: 50,
    timeMax: 50,
    characterName: 'Iolan',
    classShort: 'Mage',
    level: 2,
    lastScene: 'Harbor at dawn',
  },
  {
    id: 'ribcage-coast',
    title: 'Ribcage Coast',
    chapter: 5,
    timeCurrent: 12,
    timeMax: 50,
    characterName: 'Wren',
    classShort: 'Bard',
    level: 6,
    lastScene: 'Cliff path',
    pendingLevelUp: isPendingLevelUp(WREN_STATE.xp, WREN_STATE.level),
  },
];

export function getDefaultLobbyCharacterId(): string {
  return LOBBY_CHARACTERS[0].id;
}

export function findLobbyCharacter(
  id: string,
): LobbyCharacterOption | undefined {
  return LOBBY_CHARACTERS.find((c) => c.id === id);
}

export function activeCampaign(): CampaignListItem {
  return LOBBY_CAMPAIGNS.find((c) => c.active) ?? LOBBY_CAMPAIGNS[0];
}

export function otherCampaigns(): CampaignListItem[] {
  return LOBBY_CAMPAIGNS.filter((c) => !c.active);
}
