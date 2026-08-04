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
  solo_mode?: boolean;
  initiative_order?: string[];
  current_turn_index?: number;
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
  dice_type?: DiceType | null;
  dice_count?: number | null;
  rolls?: number[] | null;
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
  vs_label?: string | null;
}

export interface TurnResponse {
  status: 'complete' | 'pending_action';
  narrations: string[];
  pending_action: PendingAction | null;
  game_state: GameStateSnapshot;
  internal_notes: string | null;
  roll_result?: RollResultPayload | null;
}

export interface CreateSessionRequest {
  /** Optional PC name — backend schema accepts this; handler may ignore until wired. */
  character_name?: string;
  /** When true, GM scales encounters for a single player (default on backend: true). */
  solo_mode?: boolean;
  /** Campaign design party size; solo mode scales enemies as 1/N of listed count. */
  recommended_players?: number;
  campaign_template_slug?: string;
  prebuilt_character_id?: string;
  gender?: 'male' | 'female';
}

export interface CreateCharacterDraft {
  campaign_template_id?: string;
  name: string;
  gender: 'male' | 'female';
  class_id: 'warrior' | 'ranger' | 'mage' | 'bard';
  race_id: 'human' | 'elf' | 'half-orc' | 'dragonborn';
  stats: { might: number; finesse: number; wit: number; presence: number };
  starting_package_id: string;
  spells_known?: string[];
}

export type StartCharacterSelection =
  | {
      source: 'prebuilt';
      prebuilt_character_id: string;
      gender: 'male' | 'female';
    }
  | { source: 'created'; character_id: string }
  | { source: 'inline'; payload: CreateCharacterDraft };

export interface StartCampaignRequest {
  campaign_template_slug: string;
  solo_mode: boolean;
  replace_existing_solo?: boolean;
  character: StartCharacterSelection;
}

export interface StartCampaignResponse {
  active_campaign_id: string;
  character_id: string;
  session_id: string;
  character_name: string;
  campaign_template_slug: string;
  game_state: GameStateSnapshot;
}

export interface CampaignTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  genre: string;
  level_min: number;
  level_max: number;
  estimated_sessions?: string | null;
  cover_image_url?: string | null;
  content_path: string;
  recommended_players: number;
  avg_level?: number | null;
}

export interface PrebuiltCharacterSummary {
  id: string;
  class_id: string;
  name_male: string;
  name_female: string;
  level: number;
  race_id?: string | null;
  hook?: string | null;
  default_package_id?: string | null;
  starting_ability_id?: string | null;
  portrait_placeholder_key: string;
  portrait_placeholder_key_male?: string | null;
  portrait_placeholder_key_female?: string | null;
  sort_order: number;
}

export interface PackageSummary {
  id: string;
  class_id: string;
  label: string;
  theme?: string | null;
  playstyle?: string | null;
  ability_id: string;
  inventory: string[];
  equipped_weapon?: string | null;
  equipped_armor?: string | null;
  spells_known: string[];
  gold: number;
  sort_order: number;
}

export interface CreateSessionResponse {
  session_id: string;
  character_name: string;
  game_state: GameStateSnapshot;
}

export interface HealthResponse {
  status: string;
  supabase_configured: boolean;
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
  recommended_players?: number;
  level_min?: number;
  level_max?: number;
  avg_level?: number | null;
  solo_mode?: boolean;
  campaign_template_slug?: string | null;
  session_id?: string | null;
  character_id?: string | null;
  /** Lobby vitals from PC snapshot (WS-5). */
  xp?: number;
  hp?: number;
  hp_max?: number;
  mana?: number | null;
  mana_max?: number | null;
  evasion?: number;
  finesse?: number;
}

export interface CampaignListResponse {
  campaigns: CampaignSummary[];
}

export interface TranscriptEntryDto {
  kind: 'scene' | 'message' | 'roll_prompt' | 'roll_result' | 'rest' | 'item' | 'combat_start' | 'combat_end';
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
