import type { ConditionName } from '@/types';
import { getRpgThemeProfile } from '@/theme/profiles';
import type { RpgThemeId } from '@/theme/registry';

export type ConditionInfo = {
  id: ConditionName;
  label: string;
  effect: string;
  removal: string;
};

export const CONDITION_CATALOG: Record<ConditionName, ConditionInfo> = {
  poisoned: {
    id: 'poisoned',
    label: 'Poisoned',
    effect: 'Disadvantage on attack rolls and ability checks.',
    removal: 'Typically ends after a long rest or when cured by magic.',
  },
  stunned: {
    id: 'stunned',
    label: 'Stunned',
    effect: 'Cannot take actions; attacks against you have advantage.',
    removal: 'Usually until end of next turn or when the source is removed.',
  },
  frightened: {
    id: 'frightened',
    label: 'Frightened',
    effect: 'Disadvantage on ability checks and attack rolls while source is in sight.',
    removal: 'Ends when you can no longer see the source or after a long rest.',
  },
  restrained: {
    id: 'restrained',
    label: 'Restrained',
    effect: 'Speed 0; disadvantage on attacks; attacks against you have advantage.',
    removal: 'Escape a Fin or Mig check vs the restraining effect, or remove the source.',
  },
  prone: {
    id: 'prone',
    label: 'Prone',
    effect: 'Melee attacks against you have advantage; ranged have disadvantage.',
    removal: 'Stand up (costs movement) or be lifted.',
  },
};

export const ALL_CONDITIONS: ConditionName[] = [
  'poisoned',
  'stunned',
  'frightened',
  'restrained',
  'prone',
];

export function conditionLabel(id: ConditionName): string {
  return CONDITION_CATALOG[id].label;
}

/** Compact glyphs for the vital-strip conditions chip. */
export const CONDITION_ICONS: Record<ConditionName, string> = {
  poisoned: '☠',
  stunned: '⚡',
  frightened: '◎',
  restrained: '⛓',
  prone: '▽',
};

export function conditionIcon(
  id: ConditionName,
  themeId?: RpgThemeId,
): string {
  if (themeId) {
    return getRpgThemeProfile(themeId).conditionIcons[id];
  }
  return CONDITION_ICONS[id];
}

export function activeConditionInfos(
  active: ConditionName[],
): ConditionInfo[] {
  return active.map((id) => CONDITION_CATALOG[id]);
}
