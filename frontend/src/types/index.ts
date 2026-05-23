/**
 * TypeScript types mirroring the backend API schemas.
 */

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export type ConditionName =
  | 'poisoned'
  | 'stunned'
  | 'frightened'
  | 'restrained'
  | 'prone';

export type AdvType = 'norm' | 'adv' | 'dis';

export type SpellTierName = 'Minor' | 'Major' | 'Mythic';

export interface Stats {
  might: number;
  finesse: number;
  wit: number;
  presence: number;
}

export interface CoinPurse {
  copper: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface SpellDefinition {
  id: string;
  name: string;
  tier: SpellTierName;
  mp_cost: number;
  locked: boolean;
  locked_reason?: string | null;
}

export interface CharacterState {
  name: string;
  character_class: string;
  level: number;
  xp: number;
  stats: Stats;
  hp: number;
  hp_max: number;
  evasion: number;
  mana: number | null;
  mana_max: number | null;
  conditions: ConditionName[];
  class_abilities: string[];
  spells_known: string[];
  spells?: SpellDefinition[];
  gold: number;
  coin_purse?: CoinPurse;
  inventory: string[];
  equipped_weapon: string | null;
  equipped_armor: string | null;
}

export interface EnemyState {
  name: string;
  hp: number;
  hp_max: number;
  evasion: number;
  attack_modifier: number;
  damage: string;
  conditions: ConditionName[];
}

export interface GameStateSnapshot {
  character: CharacterState | null;
  enemies: Record<string, EnemyState>;
  countdowns: Record<string, number>;
  in_combat: boolean;
  boss_encounter?: boolean;
  chapter?: number;
  scene_label?: string;
  time_current?: number;
  time_max?: number;
  campaign_title?: string;
  pending_level_up?: boolean;
}

export interface PendingAction {
  action_type: string;
  dice_count: number;
  dice_type: DiceType;
  purpose: string;
  tool_call_id: string;
  stat?: string;
  modifier?: number;
  dc?: number;
  vs_label?: string;
  adv_type?: AdvType;
  adv_reason?: string;
  footer?: string;
  success_text?: string;
  fail_text?: string;
}

export interface RollResultPayload {
  prompt_id?: string | null;
  label: string;
  stat?: string | null;
  nat: number;
  die_a: number;
  die_b?: number | null;
  total: number;
  modifier: number;
  adv_used: AdvType;
  crit: boolean;
  fumble: boolean;
  pass?: boolean | null;
  vs?: number | null;
  dc?: number | null;
}

export interface TurnResponse {
  status: 'complete' | 'pending_action';
  narrations: string[];
  pending_action: PendingAction | null;
  game_state: GameStateSnapshot;
  internal_notes: string | null;
  roll_result?: RollResultPayload | null;
}

export interface CreateSessionResponse {
  session_id: string;
  character_name: string;
  game_state: GameStateSnapshot;
}

export interface CastSpellRequest {
  spell_id: string;
  tier: SpellTierName;
  mp_cost: number;
}

export interface TurnRequest {
  message?: string;
  action_response?: {
    roll_result: number;
    individual_rolls?: number[];
  };
  rest_type?: 'short' | 'long';
  use_item?: string;
  cast_spell?: CastSpellRequest;
}

export interface LevelUpRequest {
  kind: 'hp' | 'evasion' | 'ability';
  hp_mode?: 'fixed' | 'roll';
  hp_amount?: number;
  ability_id?: string;
}

export interface BossDeathRequest {
  choice: 'blaze' | 'risk';
}

export interface CampaignSummary {
  id: string;
  name: string;
  chapter: number;
  time_current: number;
  time_max: number;
  last_scene: string;
  character_name: string;
  character_class: string;
  level: number;
  pending_level_up: boolean;
  active?: boolean;
}

export interface CampaignListResponse {
  campaigns: CampaignSummary[];
}

export interface TranscriptEntryDto {
  kind: 'scene' | 'message' | 'roll_prompt' | 'roll_result' | 'rest' | 'item';
  id: string;
  timestamp: number;
  role?: string | null;
  content?: string | null;
  text?: string | null;
  pending_action?: PendingAction | null;
  roll_result?: RollResultPayload | null;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  transcript: TranscriptEntryDto[];
}

export interface ChatMessage {
  role: 'player' | 'gm' | 'system';
  content: string;
  timestamp: number;
}
