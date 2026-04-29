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

export interface Stats {
  might: number;
  finesse: number;
  wit: number;
  presence: number;
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
  gold: number;
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
}

export interface PendingAction {
  action_type: string;
  dice_count: number;
  dice_type: DiceType;
  purpose: string;
  tool_call_id: string;
}

export interface TurnResponse {
  status: 'complete' | 'pending_action';
  narrations: string[];
  pending_action: PendingAction | null;
  game_state: GameStateSnapshot;
  internal_notes: string | null;
}

export interface CreateSessionResponse {
  session_id: string;
  character_name: string;
  active_campaign_id?: string | null;
  campaign_name?: string | null;
}

export interface CreateSessionRequest {
  active_campaign_id?: string;
}

export interface CampaignOption {
  id: string;
  name: string;
}

export interface CampaignsResponse {
  campaigns: CampaignOption[];
}

export interface TurnRequest {
  message?: string;
  action_response?: {
    roll_result: number;
    individual_rolls?: number[];
  };
}

export interface ChatMessage {
  role: 'player' | 'gm' | 'system';
  content: string;
  timestamp: number;
}
