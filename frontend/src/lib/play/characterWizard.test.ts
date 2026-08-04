import { describe, expect, it } from 'vitest';
import {
  assignStat,
  formatWizardProgress,
  initialWizardDraft,
  isWizardComplete,
  nextWizardStep,
  prevWizardStep,
  remainingStatValues,
  toCreateCharacterDraft,
  validateStatsAssignment,
  validateWizardStep,
} from '@/lib/play/characterWizard';

describe('characterWizard', () => {
  it('walks steps name → … → package', () => {
    expect(nextWizardStep('name')).toBe('gender');
    expect(nextWizardStep('package')).toBeNull();
    expect(prevWizardStep('name')).toBeNull();
    expect(prevWizardStep('gender')).toBe('name');
  });

  it('requires a non-empty name', () => {
    const draft = initialWizardDraft();
    expect(validateWizardStep('name', draft)).toMatch(/name/i);
    draft.name = '  Nyx  ';
    expect(validateWizardStep('name', draft)).toBeNull();
  });

  it('validates stats as +2,+1,0,-1 permutation', () => {
    expect(
      validateStatsAssignment({
        might: 2,
        finesse: 2,
        wit: 0,
        presence: -1,
      }),
    ).toMatch(/exactly once/i);

    expect(
      validateStatsAssignment({
        might: 2,
        finesse: 1,
        wit: 0,
        presence: -1,
      }),
    ).toBeNull();
  });

  it('assignStat moves a value between stats', () => {
    let stats = assignStat(
      { might: null, finesse: null, wit: null, presence: null },
      'might',
      2,
    );
    stats = assignStat(stats, 'finesse', 2);
    expect(stats.might).toBeNull();
    expect(stats.finesse).toBe(2);
    expect(remainingStatValues(stats).sort()).toEqual([-1, 0, 1]);
  });

  it('builds CreateCharacterDraft when complete', () => {
    const draft = initialWizardDraft('female');
    draft.name = 'Nyx Frost';
    draft.class_id = 'mage';
    draft.race_id = 'elf';
    draft.stats = { might: -1, finesse: 0, wit: 2, presence: 1 };
    draft.starting_package_id = 'tn-mage-frost-elementalist';
    expect(isWizardComplete(draft)).toBe(true);

    const payload = toCreateCharacterDraft(draft, 'template-1', [
      'Frost Ray',
    ]);
    expect(payload).toEqual({
      campaign_template_id: 'template-1',
      name: 'Nyx Frost',
      gender: 'female',
      class_id: 'mage',
      race_id: 'elf',
      stats: { might: -1, finesse: 0, wit: 2, presence: 1 },
      starting_package_id: 'tn-mage-frost-elementalist',
      spells_known: ['Frost Ray'],
    });
  });

  it('rejects incomplete draft conversion', () => {
    expect(() =>
      toCreateCharacterDraft(initialWizardDraft(), 't1'),
    ).toThrow(/incomplete/i);
  });

  it('formats progressive wizard breadcrumb', () => {
    const draft = initialWizardDraft('female');
    expect(formatWizardProgress('name', draft)).toBe('Step 1 of 6 · Name');

    draft.name = 'Mira';
    expect(formatWizardProgress('gender', draft)).toBe(
      'Step 2 of 6 · Mira · Gender',
    );

    expect(formatWizardProgress('class', draft)).toBe(
      'Step 3 of 6 · Mira · Female ♀ · Class',
    );

    draft.class_id = 'mage';
    expect(formatWizardProgress('race', draft)).toBe(
      'Step 4 of 6 · Mira · Female ♀ · Mage · Race',
    );

    draft.race_id = 'elf';
    expect(
      formatWizardProgress('stats', draft, (id) =>
        id === 'elf' ? 'Elf' : id,
      ),
    ).toBe('Step 5 of 6 · Mira · Female ♀ · Mage · Elf');
  });
});
