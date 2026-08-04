import { describe, expect, it } from 'vitest';
import type {
  CampaignTemplateSummary,
  PrebuiltCharacterSummary,
} from '@/types';
import {
  canGoNext,
  canStart,
  completeWizard,
  confirmCharacterName,
  goBack,
  goNext,
  initialNewCampaignFlowState,
  playParamsFromStart,
  resolvedPrebuiltName,
  selectPath,
  selectPrebuilt,
  selectTemplate,
  setGender,
  soloConflictFromError,
  sortPrebuiltsByClass,
} from '@/lib/play/newCampaignFlow';
import { portraitPlaceholderKey } from '@/lib/play/portraitPlaceholder';

const TEMPLATE: CampaignTemplateSummary = {
  id: 't1',
  slug: 'fantasy-lost-mine',
  name: 'Lost Mine of Phandelver',
  genre: 'fantasy',
  level_min: 1,
  level_max: 5,
  content_path: 'LostMineOfPhandelverAdapted',
  recommended_players: 4,
  avg_level: 3,
};

const PREBUILT: PrebuiltCharacterSummary = {
  id: 'p1',
  class_id: 'warrior',
  name_male: 'Aldric of Corlinn Hill',
  name_female: 'Elara of Corlinn Hill',
  level: 1,
  portrait_placeholder_key: 'warrior-male',
  portrait_placeholder_key_male: 'warrior-male',
  portrait_placeholder_key_female: 'warrior-female',
  sort_order: 1,
};

describe('newCampaignFlow', () => {
  it('advancing from template defaults path to prebuilt', () => {
    let state = selectTemplate(initialNewCampaignFlowState(), TEMPLATE);
    state = goNext(state);
    expect(state.step).toBe('path');
    expect(state.path).toBe('prebuilt');
  });

  it('defaults gender to female', () => {
    expect(initialNewCampaignFlowState().gender).toBe('female');
  });

  it('selecting template keeps step until next; clears character on change', () => {
    let state = selectTemplate(initialNewCampaignFlowState(), TEMPLATE);
    expect(state.step).toBe('template');
    expect(canGoNext(state)).toBe(true);
    state = goNext(state);
    expect(state.step).toBe('path');
    state = selectPath(state, 'prebuilt');
    state = selectPrebuilt(state, PREBUILT);
    state = selectTemplate(state, {
      ...TEMPLATE,
      id: 't2',
      slug: 'fantasy-touch-of-the-necromancer',
    });
    expect(state.path).toBeNull();
    expect(state.prebuilt).toBeNull();
  });

  it('prebuilt path advances to prebuilt then confirm', () => {
    let state = selectTemplate(initialNewCampaignFlowState(), TEMPLATE);
    state = goNext(state);
    state = selectPath(state, 'prebuilt');
    state = goNext(state);
    expect(state.step).toBe('prebuilt');
    expect(canGoNext(state)).toBe(false);
    state = selectPrebuilt(state, PREBUILT);
    expect(canGoNext(state)).toBe(true);
    state = goNext(state);
    expect(state.step).toBe('confirm');
  });

  it('create path lands on wizard; confirm via completeWizard', () => {
    let state = selectTemplate(initialNewCampaignFlowState(), TEMPLATE);
    state = goNext(state);
    state = selectPath(state, 'create');
    state = goNext(state);
    expect(state.step).toBe('wizard');
    expect(canGoNext(state)).toBe(false);
    expect(goNext(state).step).toBe('wizard');

    state = completeWizard(
      state,
      {
        campaign_template_id: TEMPLATE.id,
        name: 'Nyx',
        gender: 'female',
        class_id: 'mage',
        race_id: 'elf',
        stats: { might: -1, finesse: 0, wit: 2, presence: 1 },
        starting_package_id: 'lm-mage-ember-elementalist',
      },
      'Ember Elementalist',
    );
    expect(state.step).toBe('confirm');
    expect(state.gender).toBe('female');
    expect(state.draftPackageLabel).toBe('Ember Elementalist');
    expect(canStart(state)).toBe(true);
    expect(confirmCharacterName(state)).toBe('Nyx');
    state = goBack(state);
    expect(state.step).toBe('wizard');
    expect(state.draft?.name).toBe('Nyx');
    expect(state.draftPackageLabel).toBe('Ember Elementalist');
  });

  it('necromancer create path can confirm either package label', () => {
    const necromancer: CampaignTemplateSummary = {
      ...TEMPLATE,
      id: 't2',
      slug: 'fantasy-touch-of-the-necromancer',
      name: 'Touch of the Necromancer',
      content_path: 'TouchOfTheNecromancerAdapted',
      recommended_players: 1,
      avg_level: 2,
      level_max: 3,
    };
    for (const [packageId, label] of [
      ['tn-mage-frost-elementalist', 'Frost Elementalist'],
      ['tn-mage-binding-adept', 'Binding Adept'],
    ] as const) {
      let state = selectTemplate(initialNewCampaignFlowState(), necromancer);
      state = goNext(state);
      state = selectPath(state, 'create');
      state = goNext(state);
      state = completeWizard(
        state,
        {
          campaign_template_id: necromancer.id,
          name: 'Nyx Frost',
          gender: 'female',
          class_id: 'mage',
          race_id: 'elf',
          stats: { might: -1, finesse: 0, wit: 2, presence: 1 },
          starting_package_id: packageId,
        },
        label,
      );
      expect(canStart(state)).toBe(true);
      expect(state.draft?.starting_package_id).toBe(packageId);
      expect(state.draftPackageLabel).toBe(label);
    }
  });

  it('lost mine prebuilt female name resolves for confirm', () => {
    let state = selectTemplate(initialNewCampaignFlowState(), TEMPLATE);
    state = goNext(state);
    state = selectPath(state, 'prebuilt');
    state = goNext(state);
    state = selectPrebuilt(state, PREBUILT);
    state = setGender(state, 'female');
    state = goNext(state);
    expect(state.step).toBe('confirm');
    expect(confirmCharacterName(state)).toBe('Elara of Corlinn Hill');
    expect(canStart(state)).toBe(true);
  });

  it('back preserves selections', () => {
    let state = selectTemplate(initialNewCampaignFlowState(), TEMPLATE);
    state = goNext(state);
    state = selectPath(state, 'prebuilt');
    state = goNext(state);
    state = selectPrebuilt(state, PREBUILT);
    state = setGender(state, 'female');
    state = goNext(state);
    expect(state.step).toBe('confirm');
    state = goBack(state);
    expect(state.step).toBe('prebuilt');
    expect(state.prebuilt?.id).toBe('p1');
    expect(state.gender).toBe('female');
    expect(state.template?.slug).toBe('fantasy-lost-mine');
  });

  it('resolves display name from gender', () => {
    expect(resolvedPrebuiltName(PREBUILT, 'male')).toBe('Aldric of Corlinn Hill');
    expect(resolvedPrebuiltName(PREBUILT, 'female')).toBe(
      'Elara of Corlinn Hill',
    );
  });

  it('portrait placeholder keys are class-gender', () => {
    expect(portraitPlaceholderKey('mage', 'female')).toBe('mage-female');
  });

  it('parses solo conflict from API error', () => {
    const err = new Error(
      `API 409: ${JSON.stringify({
        detail: {
          code: 'solo_conflict',
          existing_campaign_id: 'camp-1',
          continue_path: '/active-campaigns/camp-1/continue',
        },
      })}`,
    );
    const info = soloConflictFromError(err);
    expect(info?.existing_campaign_id).toBe('camp-1');
    expect(info?.continue_path).toContain('continue');
  });

  it('playParamsFromStart includes activeCampaignId and sessionId', () => {
    const qs = playParamsFromStart({
      activeCampaignId: 'ac-9',
      sessionId: 'sess-9',
      characterName: 'Vespera Greythorn',
      campaignTemplateSlug: 'fantasy-touch-of-the-necromancer',
      soloMode: true,
      recommendedPlayers: 1,
    });
    const params = new URLSearchParams(qs);
    expect(params.get('activeCampaignId')).toBe('ac-9');
    expect(params.get('sessionId')).toBe('sess-9');
    expect(params.get('campaignId')).toBe('ac-9');
    expect(params.get('templateSlug')).toBe(
      'fantasy-touch-of-the-necromancer',
    );
    expect(params.get('characterName')).toBe('Vespera Greythorn');
  });

  it('sortPrebuiltsByClass orders warrior ranger mage bard', () => {
    const sorted = sortPrebuiltsByClass([
      { class_id: 'bard', sort_order: 1 },
      { class_id: 'mage', sort_order: 1 },
      { class_id: 'warrior', sort_order: 2 },
      { class_id: 'ranger', sort_order: 1 },
      { class_id: 'warrior', sort_order: 1 },
    ]);
    expect(sorted.map((p) => `${p.class_id}:${p.sort_order}`)).toEqual([
      'warrior:1',
      'warrior:2',
      'ranger:1',
      'mage:1',
      'bard:1',
    ]);
  });
});
