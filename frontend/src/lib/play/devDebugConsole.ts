import { isDev } from '@/config';

export const DEBUG_CONSOLE_STORAGE_KEY = 'vgm-play-debug-console';

export type DevDebugActionId =
  | 'level_up_pending'
  | 'level_up_clear'
  | 'boss_zero'
  | 'non_boss_zero'
  | 'enter_combat'
  | 'exit_combat'
  | 'toggle_boss_encounter'
  | 'full_heal'
  | 'low_hp'
  | 'add_poisoned'
  | 'add_stunned'
  | 'clear_conditions'
  | 'demo_conditions'
  | 'roll_prompt'
  | 'scene_marker'
  | 'short_rest_log'
  | 'long_rest_log'
  | 'item_log'
  | 'caster_mage'
  | 'high_level_mage'
  | 'open_cast_tray'
  | 'open_free_roll'
  | 'open_conditions';

export type DevDebugAction = {
  id: DevDebugActionId;
  label: string;
  hint: string;
  category: 'WS-7 flows' | 'Combat & vitals' | 'Transcript' | 'UI panels' | 'Character';
  /** Handled in useChat (game state / transcript). */
  scope: 'chat' | 'layout';
};

export const DEV_DEBUG_ACTIONS: DevDebugAction[] = [
  {
    id: 'level_up_pending',
    label: 'Level-up pending',
    hint: 'XP at next threshold, out of combat',
    category: 'WS-7 flows',
    scope: 'chat',
  },
  {
    id: 'level_up_clear',
    label: 'Clear level-up',
    hint: 'XP below threshold',
    category: 'WS-7 flows',
    scope: 'chat',
  },
  {
    id: 'boss_zero',
    label: 'Boss HP = 0',
    hint: 'Boss modal (boss_encounter + combat)',
    category: 'WS-7 flows',
    scope: 'chat',
  },
  {
    id: 'non_boss_zero',
    label: 'Non-boss HP = 0',
    hint: 'Auto-recover message',
    category: 'WS-7 flows',
    scope: 'chat',
  },
  {
    id: 'enter_combat',
    label: 'Enter combat',
    hint: 'in_combat true (blocks level-up)',
    category: 'Combat & vitals',
    scope: 'chat',
  },
  {
    id: 'exit_combat',
    label: 'Exit combat',
    hint: 'in_combat false',
    category: 'Combat & vitals',
    scope: 'chat',
  },
  {
    id: 'toggle_boss_encounter',
    label: 'Toggle boss flag',
    hint: 'Flip boss_encounter stub',
    category: 'Combat & vitals',
    scope: 'chat',
  },
  {
    id: 'full_heal',
    label: 'Full heal',
    hint: 'HP/MP to max',
    category: 'Combat & vitals',
    scope: 'chat',
  },
  {
    id: 'low_hp',
    label: 'Low HP',
    hint: 'HP = 1',
    category: 'Combat & vitals',
    scope: 'chat',
  },
  {
    id: 'add_poisoned',
    label: '+ Poisoned',
    hint: 'Append condition',
    category: 'Character',
    scope: 'chat',
  },
  {
    id: 'add_stunned',
    label: '+ Stunned',
    hint: 'Append condition',
    category: 'Character',
    scope: 'chat',
  },
  {
    id: 'clear_conditions',
    label: 'Clear conditions',
    hint: 'Remove all conditions',
    scope: 'chat',
    category: 'Character',
  },
  {
    id: 'demo_conditions',
    label: 'Poisoned + stunned',
    hint: 'Preset two conditions for UI test',
    category: 'Character',
    scope: 'chat',
  },
  {
    id: 'caster_mage',
    label: 'Switch to mage',
    hint: 'Caster + spells for cast tray',
    category: 'Character',
    scope: 'chat',
  },
  {
    id: 'high_level_mage',
    label: 'Mage Lv 8',
    hint: 'Unlock mythic tier in cast tray',
    category: 'Character',
    scope: 'chat',
  },
  {
    id: 'roll_prompt',
    label: 'GM roll prompt',
    hint: 'Dev roll card in transcript',
    category: 'Transcript',
    scope: 'chat',
  },
  {
    id: 'scene_marker',
    label: 'Scene marker',
    hint: 'Scene · debug location',
    category: 'Transcript',
    scope: 'chat',
  },
  {
    id: 'short_rest_log',
    label: 'Short rest log',
    hint: 'System rest entry',
    category: 'Transcript',
    scope: 'chat',
  },
  {
    id: 'long_rest_log',
    label: 'Long rest log',
    hint: 'System rest entry',
    category: 'Transcript',
    scope: 'chat',
  },
  {
    id: 'item_log',
    label: 'Item used log',
    hint: 'System item entry',
    category: 'Transcript',
    scope: 'chat',
  },
  {
    id: 'open_cast_tray',
    label: 'Open cast tray',
    hint: 'Cast spell panel (caster)',
    category: 'UI panels',
    scope: 'layout',
  },
  {
    id: 'open_free_roll',
    label: 'Open free roll',
    hint: 'Roll tray',
    category: 'UI panels',
    scope: 'layout',
  },
  {
    id: 'open_conditions',
    label: 'Open conditions',
    hint: 'Conditions modal',
    category: 'UI panels',
    scope: 'layout',
  },
];

export function devDebugEnabled(): boolean {
  return isDev;
}

export function readDebugConsoleOpen(): boolean {
  if (!isDev) return false;
  try {
    return localStorage.getItem(DEBUG_CONSOLE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDebugConsoleOpen(open: boolean): void {
  if (!isDev) return;
  try {
    localStorage.setItem(DEBUG_CONSOLE_STORAGE_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function xpForPendingLevelUp(level: number): number {
  const thresholds: Record<number, number> = {
    2: 100,
    3: 250,
    4: 500,
    5: 1_000,
    6: 2_000,
    7: 4_000,
    8: 7_000,
    9: 11_000,
    10: 16_000,
  };
  return thresholds[level + 1] ?? 16_000;
}
