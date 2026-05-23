import { DEMO_CHARACTER } from '@/lib/play/characterView';
import { shouldBlockForLevelUp } from '@/lib/play/levelUp';
import type { DevDebugActionId } from '@/lib/play/devDebugConsole';
import { xpForPendingLevelUp } from '@/lib/play/devDebugConsole';
import type { CharacterState, ConditionName, GameStateSnapshot } from '@/types';

/** Keep client flags aligned with character XP/combat (fixes stale `pending_level_up`). */
export function syncGameStateFlags(
  gs: GameStateSnapshot,
): GameStateSnapshot {
  if (!gs.character) {
    return { ...gs, pending_level_up: false };
  }
  return {
    ...gs,
    pending_level_up: shouldBlockForLevelUp(gs.character, gs.in_combat),
  };
}

const MAGE_PRESET: CharacterState = {
  ...DEMO_CHARACTER,
  character_class: 'mage',
  level: 4,
  xp: 680,
  hp: 22,
  hp_max: 22,
  mana: 9,
  mana_max: 9,
  spells_known: ['voltaic_lance', 'static_snare'],
  conditions: [],
};

const HIGH_MAGE_PRESET: CharacterState = {
  ...MAGE_PRESET,
  level: 8,
  xp: 7_000,
  mana: 20,
  mana_max: 20,
};

function withCharacter(
  gs: GameStateSnapshot,
  patch: Partial<CharacterState> | CharacterState,
): GameStateSnapshot {
  if (!gs.character) return gs;
  const character =
    'name' in patch && 'character_class' in patch
      ? (patch as CharacterState)
      : { ...gs.character, ...patch };
  return syncGameStateFlags({ ...gs, character });
}

function addCondition(
  gs: GameStateSnapshot,
  id: ConditionName,
): GameStateSnapshot {
  if (!gs.character) return gs;
  const conditions = gs.character.conditions.includes(id)
    ? gs.character.conditions
    : [...gs.character.conditions, id];
  return withCharacter(gs, { conditions });
}

/** Apply a debug preset; returns null if no character. */
export function applyDebugGamePatch(
  gs: GameStateSnapshot,
  actionId: DevDebugActionId,
): GameStateSnapshot | null {
  if (!gs.character) return null;

  switch (actionId) {
    case 'level_up_pending':
      return syncGameStateFlags({
        ...gs,
        in_combat: false,
        boss_encounter: false,
        character: {
          ...gs.character,
          hp: Math.max(1, gs.character.hp),
          xp: xpForPendingLevelUp(gs.character.level),
        },
      });

    case 'level_up_clear':
      return syncGameStateFlags({
        ...gs,
        in_combat: false,
        boss_encounter: false,
        character: {
          ...gs.character,
          level: 1,
          xp: 0,
        },
        pending_level_up: false,
      });

    case 'boss_zero':
      return syncGameStateFlags({
        ...gs,
        in_combat: true,
        boss_encounter: true,
        character: { ...gs.character, hp: 0 },
      });

    case 'non_boss_zero':
      return syncGameStateFlags({
        ...gs,
        in_combat: true,
        boss_encounter: false,
        character: { ...gs.character, hp: 0 },
      });

    case 'enter_combat':
      return syncGameStateFlags({ ...gs, in_combat: true });

    case 'exit_combat':
      return syncGameStateFlags({
        ...gs,
        in_combat: false,
        boss_encounter: false,
      });

    case 'toggle_boss_encounter':
      return syncGameStateFlags({
        ...gs,
        boss_encounter: !gs.boss_encounter,
      });

    case 'full_heal':
      return withCharacter(gs, {
        hp: gs.character.hp_max,
        mana:
          gs.character.mana_max != null
            ? gs.character.mana_max
            : gs.character.mana,
      });

    case 'low_hp':
      return withCharacter(gs, {
        hp: Math.max(1, Math.min(gs.character.hp, 3)),
      });

    case 'add_poisoned':
      return addCondition(gs, 'poisoned');

    case 'add_stunned':
      return addCondition(gs, 'stunned');

    case 'demo_conditions': {
      let next = addCondition(gs, 'poisoned');
      next = addCondition(next, 'stunned');
      return next;
    }

    case 'clear_conditions':
      return withCharacter(gs, { conditions: [] });

    case 'caster_mage':
      return syncGameStateFlags({
        ...gs,
        in_combat: false,
        boss_encounter: false,
        character: {
          ...MAGE_PRESET,
          name: gs.character.name,
        },
      });

    case 'high_level_mage':
      return syncGameStateFlags({
        ...gs,
        in_combat: false,
        boss_encounter: false,
        character: HIGH_MAGE_PRESET,
      });

    default:
      return gs;
  }
}

/** Whether this action needs combat/HP cleared before UI panels work. */
export function debugActionNeedsUnblock(id: DevDebugActionId): boolean {
  return [
    'roll_prompt',
    'open_cast_tray',
    'open_free_roll',
    'open_conditions',
    'short_rest_log',
    'long_rest_log',
    'item_log',
    'scene_marker',
  ].includes(id);
}

/** Clear blocking overlays and restore HP so UI panels can open. */
export function applyDebugPanelPrep(gs: GameStateSnapshot): GameStateSnapshot {
  if (!gs.character) return gs;
  return syncGameStateFlags({
    ...gs,
    in_combat: false,
    boss_encounter: false,
    character: {
      ...gs.character,
      hp:
        gs.character.hp <= 0 ? Math.max(1, gs.character.hp_max) : gs.character.hp,
      xp: 0,
      level: gs.character.level,
    },
    pending_level_up: false,
  });
}

export function debugUnblockForPanels(
  gs: GameStateSnapshot,
): GameStateSnapshot {
  if (!gs.character) return gs;
  return syncGameStateFlags({
    ...gs,
    in_combat: false,
    boss_encounter: false,
    character: {
      ...gs.character,
      hp: gs.character.hp <= 0 ? gs.character.hp_max : gs.character.hp,
      xp:
        gs.pending_level_up || shouldBlockForLevelUp(gs.character, gs.in_combat)
          ? 0
          : gs.character.xp,
    },
    pending_level_up: false,
  });
}
