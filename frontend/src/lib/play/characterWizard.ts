/**
 * Character creation wizard (WS-4).
 * Steps: name → gender → class → race → stats → package.
 */

import type { CreateCharacterDraft, PackageSummary } from '@/types';

export type WizardClassId = CreateCharacterDraft['class_id'];
export type WizardRaceId = CreateCharacterDraft['race_id'];
export type WizardGender = CreateCharacterDraft['gender'];

export type WizardStepId =
  | 'name'
  | 'gender'
  | 'class'
  | 'race'
  | 'stats'
  | 'package';

export const WIZARD_STEPS: WizardStepId[] = [
  'name',
  'gender',
  'class',
  'race',
  'stats',
  'package',
];

export const WIZARD_CLASSES: { id: WizardClassId; label: string }[] = [
  { id: 'warrior', label: 'Warrior' },
  { id: 'ranger', label: 'Ranger' },
  { id: 'mage', label: 'Mage' },
  { id: 'bard', label: 'Bard' },
];

export const WIZARD_RACES: { id: WizardRaceId; label: string }[] = [
  { id: 'human', label: 'Human' },
  { id: 'elf', label: 'Elf' },
  { id: 'half-orc', label: 'Half-orc' },
  { id: 'dragonborn', label: 'Dragonborn' },
];

export const STAT_KEYS = ['might', 'finesse', 'wit', 'presence'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** POC ruleset: assign +2, +1, 0, −1 once each. */
export const STAT_POOL = [2, 1, 0, -1] as const;

export type WizardDraft = {
  name: string;
  gender: WizardGender;
  class_id: WizardClassId | null;
  race_id: WizardRaceId | null;
  /** null = unassigned slot */
  stats: Record<StatKey, number | null>;
  starting_package_id: string | null;
};

export function initialWizardDraft(
  gender: WizardGender = 'female',
): WizardDraft {
  return {
    name: '',
    gender,
    class_id: null,
    race_id: null,
    stats: { might: null, finesse: null, wit: null, presence: null },
    starting_package_id: null,
  };
}

export function wizardStepTitle(step: WizardStepId): string {
  switch (step) {
    case 'name':
      return 'Name';
    case 'gender':
      return 'Gender';
    case 'class':
      return 'Class';
    case 'race':
      return 'Race';
    case 'stats':
      return 'Stats';
    case 'package':
      return 'Starting gear';
  }
}

export function wizardStepIndex(step: WizardStepId): number {
  return WIZARD_STEPS.indexOf(step);
}

export function nextWizardStep(step: WizardStepId): WizardStepId | null {
  const i = wizardStepIndex(step);
  return i >= 0 && i < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[i + 1]! : null;
}

export function prevWizardStep(step: WizardStepId): WizardStepId | null {
  const i = wizardStepIndex(step);
  return i > 0 ? WIZARD_STEPS[i - 1]! : null;
}

export function validateWizardStep(
  step: WizardStepId,
  draft: WizardDraft,
): string | null {
  switch (step) {
    case 'name': {
      const name = draft.name.trim();
      if (!name) return 'Enter a character name.';
      if (name.length > 100) return 'Name must be 100 characters or fewer.';
      return null;
    }
    case 'gender':
      return draft.gender === 'male' || draft.gender === 'female'
        ? null
        : 'Choose a gender.';
    case 'class':
      return draft.class_id ? null : 'Choose a class.';
    case 'race':
      return draft.race_id ? null : 'Choose a race.';
    case 'stats':
      return validateStatsAssignment(draft.stats);
    case 'package':
      return draft.starting_package_id
        ? null
        : 'Choose a starting package.';
    default:
      return null;
  }
}

export function validateStatsAssignment(
  stats: Record<StatKey, number | null>,
): string | null {
  const values = STAT_KEYS.map((k) => stats[k]);
  if (values.some((v) => v == null)) {
    return 'Assign +2, +1, 0, and −1 once each.';
  }
  const sorted = [...(values as number[])].sort((a, b) => b - a);
  const expected = [...STAT_POOL].sort((a, b) => b - a);
  if (sorted.some((v, i) => v !== expected[i])) {
    return 'Stats must use each of +2, +1, 0, and −1 exactly once.';
  }
  return null;
}

export function remainingStatValues(
  stats: Record<StatKey, number | null>,
): number[] {
  const used = new Set(
    STAT_KEYS.map((k) => stats[k]).filter((v): v is number => v != null),
  );
  return STAT_POOL.filter((v) => !used.has(v));
}

/** Assign a pool value to a stat; clears that value from any other stat. */
export function assignStat(
  stats: Record<StatKey, number | null>,
  key: StatKey,
  value: number | null,
): Record<StatKey, number | null> {
  const next = { ...stats };
  if (value != null) {
    for (const k of STAT_KEYS) {
      if (k !== key && next[k] === value) next[k] = null;
    }
  }
  next[key] = value;
  return next;
}

export function isWizardComplete(draft: WizardDraft): boolean {
  return WIZARD_STEPS.every((step) => validateWizardStep(step, draft) == null);
}

/**
 * Where to resume the wizard for a given draft: the first step that still
 * fails validation, or the last step when the draft is already complete
 * (e.g. returning from Confirm to tweak a choice).
 */
export function initialWizardStepForDraft(draft: WizardDraft): WizardStepId {
  for (const step of WIZARD_STEPS) {
    if (validateWizardStep(step, draft) != null) return step;
  }
  return WIZARD_STEPS[WIZARD_STEPS.length - 1]!;
}

export function toCreateCharacterDraft(
  draft: WizardDraft,
  campaignTemplateId: string,
  packageSpells?: string[],
): CreateCharacterDraft {
  if (!isWizardComplete(draft) || !draft.class_id || !draft.race_id) {
    throw new Error('Wizard draft is incomplete');
  }
  const stats = {
    might: draft.stats.might as number,
    finesse: draft.stats.finesse as number,
    wit: draft.stats.wit as number,
    presence: draft.stats.presence as number,
  };
  return {
    campaign_template_id: campaignTemplateId,
    name: draft.name.trim(),
    gender: draft.gender,
    class_id: draft.class_id,
    race_id: draft.race_id,
    stats,
    starting_package_id: draft.starting_package_id!,
    ...(packageSpells?.length ? { spells_known: packageSpells } : {}),
  };
}

export function formatStatModifier(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

/** Short blurbs for the stats assignment step (aligned with game.models.Stats). */
export const STAT_BLURBS: Record<StatKey, string> = {
  might: 'Physical power and endurance — melee attacks, lifting, resisting harm.',
  finesse: 'Coordination and stealth — ranged attacks, evasion, delicate work.',
  wit: 'Perception and smarts — noticing clues, recalling lore, investigation.',
  presence: 'Charm and force of personality — persuasion, leadership, performance.',
};

export function classLabel(classId: WizardClassId | null): string {
  if (!classId) return 'Class';
  return WIZARD_CLASSES.find((c) => c.id === classId)?.label ?? classId;
}

export function genderProgressLabel(gender: WizardGender): string {
  return gender === 'female' ? 'Female ♀' : 'Male ♂';
}

/**
 * Progressive wizard header: `Step x of y · Name · Gender · Class · Race`
 * Completed choices replace the placeholder labels as the player advances.
 */
export function formatWizardProgress(
  step: WizardStepId,
  draft: WizardDraft,
  raceLabelForId?: (id: WizardRaceId) => string,
): string {
  const idx = wizardStepIndex(step);
  const total = WIZARD_STEPS.length;
  const parts: string[] = [`Step ${idx + 1} of ${total}`];

  const name = draft.name.trim();
  parts.push(name || 'Name');

  if (idx >= 1) {
    parts.push(idx === 1 ? 'Gender' : genderProgressLabel(draft.gender));
  }
  if (idx >= 2) {
    parts.push(
      idx === 2 && !draft.class_id ? 'Class' : classLabel(draft.class_id),
    );
  }
  if (idx >= 3) {
    if (idx === 3 && !draft.race_id) {
      parts.push('Race');
    } else if (draft.race_id) {
      parts.push(raceLabelForId?.(draft.race_id) ?? draft.race_id);
    } else {
      parts.push('Race');
    }
  }

  return parts.join(' · ');
}

export function packagePreviewLines(pkg: PackageSummary): string[] {
  const lines: string[] = [];
  if (pkg.equipped_weapon) lines.push(`Weapon: ${pkg.equipped_weapon}`);
  if (pkg.equipped_armor) lines.push(`Armor: ${pkg.equipped_armor}`);
  if (pkg.spells_known.length) {
    lines.push(`Spells: ${pkg.spells_known.join(', ')}`);
  }
  const equipped = new Set(
    [pkg.equipped_weapon, pkg.equipped_armor]
      .filter((x): x is string => Boolean(x))
      .map((x) => x.toLowerCase()),
  );
  const gear = pkg.inventory.filter(
    (item) => !equipped.has(item.toLowerCase()),
  );
  if (gear.length) {
    lines.push(
      `Gear: ${gear.slice(0, 4).join(', ')}${gear.length > 4 ? '…' : ''}`,
    );
  }
  return lines;
}
