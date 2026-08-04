/**
 * New-campaign flow state helpers (WS-3 / WS-4).
 * Steps: template → path → prebuilt | wizard → confirm → start.
 */

import type {
  CampaignTemplateSummary,
  CreateCharacterDraft,
  PrebuiltCharacterSummary,
} from '@/types';

export type CharacterPath = 'prebuilt' | 'create';
export type FlowGender = 'male' | 'female';

export type NewCampaignStep =
  | 'template'
  | 'path'
  | 'prebuilt'
  | 'wizard'
  | 'confirm';

export type SoloConflictInfo = {
  existing_campaign_id: string;
  session_id?: string | null;
  session_live?: boolean;
  continue_path?: string;
};

export type NewCampaignFlowState = {
  step: NewCampaignStep;
  template: CampaignTemplateSummary | null;
  path: CharacterPath | null;
  prebuilt: PrebuiltCharacterSummary | null;
  /** Completed create-path draft (set when wizard finishes). */
  draft: CreateCharacterDraft | null;
  /** Human-readable label for draft.starting_package_id, for display only. */
  draftPackageLabel: string | null;
  gender: FlowGender;
  soloMode: boolean;
};

export function initialNewCampaignFlowState(): NewCampaignFlowState {
  return {
    step: 'template',
    template: null,
    path: null,
    prebuilt: null,
    draft: null,
    draftPackageLabel: null,
    gender: 'female',
    soloMode: true,
  };
}

export function selectTemplate(
  state: NewCampaignFlowState,
  template: CampaignTemplateSummary,
): NewCampaignFlowState {
  const templateChanged = state.template?.id !== template.id;
  return {
    ...state,
    template,
    // Reset downstream when template changes
    path: templateChanged ? null : state.path,
    prebuilt: templateChanged ? null : state.prebuilt,
    draft: templateChanged ? null : state.draft,
    draftPackageLabel: templateChanged ? null : state.draftPackageLabel,
  };
}

export function selectPath(
  state: NewCampaignFlowState,
  path: CharacterPath,
): NewCampaignFlowState {
  return {
    ...state,
    path,
    prebuilt: path === 'prebuilt' ? state.prebuilt : null,
    draft: path === 'create' ? state.draft : null,
    draftPackageLabel: path === 'create' ? state.draftPackageLabel : null,
  };
}

export function selectPrebuilt(
  state: NewCampaignFlowState,
  prebuilt: PrebuiltCharacterSummary,
): NewCampaignFlowState {
  return { ...state, prebuilt };
}

export function setGender(
  state: NewCampaignFlowState,
  gender: FlowGender,
): NewCampaignFlowState {
  return { ...state, gender };
}

export function setSoloMode(
  state: NewCampaignFlowState,
  soloMode: boolean,
): NewCampaignFlowState {
  return { ...state, soloMode };
}

export function completeWizard(
  state: NewCampaignFlowState,
  draft: CreateCharacterDraft,
  packageLabel: string | null = null,
): NewCampaignFlowState {
  return {
    ...state,
    draft,
    draftPackageLabel: packageLabel,
    gender: draft.gender,
    step: 'confirm',
  };
}

export function goBack(state: NewCampaignFlowState): NewCampaignFlowState {
  switch (state.step) {
    case 'path':
      return { ...state, step: 'template' };
    case 'prebuilt':
    case 'wizard':
      return { ...state, step: 'path' };
    case 'confirm':
      if (state.path === 'prebuilt') {
        return { ...state, step: 'prebuilt' };
      }
      return { ...state, step: 'wizard' };
    default:
      return state;
  }
}

export function goNext(state: NewCampaignFlowState): NewCampaignFlowState {
  switch (state.step) {
    case 'template':
      return state.template
        ? { ...state, step: 'path', path: state.path ?? 'prebuilt' }
        : state;
    case 'path':
      if (state.path === 'prebuilt') return { ...state, step: 'prebuilt' };
      if (state.path === 'create') return { ...state, step: 'wizard' };
      return state;
    case 'prebuilt':
      return state.prebuilt ? { ...state, step: 'confirm' } : state;
    case 'wizard':
      // Wizard advances internally; confirm via completeWizard()
      return state;
    default:
      return state;
  }
}

export function canGoNext(state: NewCampaignFlowState): boolean {
  switch (state.step) {
    case 'template':
      return state.template != null;
    case 'path':
      return state.path != null;
    case 'prebuilt':
      return state.prebuilt != null;
    case 'wizard':
      return false; // wizard owns its Continue
    case 'confirm':
      return false; // confirm uses Start, not Next
    default:
      return false;
  }
}

export function canGoBack(state: NewCampaignFlowState): boolean {
  return state.step !== 'template';
}

export function canStart(state: NewCampaignFlowState): boolean {
  if (!state.template) return false;
  if (state.path === 'prebuilt') return state.prebuilt != null;
  if (state.path === 'create') return state.draft != null;
  return false;
}

export function confirmCharacterName(state: NewCampaignFlowState): string {
  if (state.path === 'create' && state.draft) return state.draft.name;
  if (state.prebuilt) return resolvedPrebuiltName(state.prebuilt, state.gender);
  return 'hero';
}

export function resolvedPrebuiltName(
  prebuilt: PrebuiltCharacterSummary,
  gender: FlowGender,
): string {
  return gender === 'female' ? prebuilt.name_female : prebuilt.name_male;
}

export function stepTitle(step: NewCampaignStep): string {
  switch (step) {
    case 'template':
      return 'Choose a campaign';
    case 'path':
      return 'Choose a character';
    case 'prebuilt':
      return 'Pick a pre-built character';
    case 'wizard':
      return 'Create a character';
    case 'confirm':
      return 'Confirm & start';
  }
}

export function parseSoloConflictDetail(body: string): SoloConflictInfo | null {
  try {
    const parsed = JSON.parse(body) as {
      detail?: (SoloConflictInfo & { code?: string }) | string;
    };
    const detail = parsed.detail;
    if (typeof detail === 'object' && detail?.code === 'solo_conflict') {
      return {
        existing_campaign_id: detail.existing_campaign_id,
        session_id: detail.session_id,
        session_live: detail.session_live,
        continue_path: detail.continue_path,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Extract JSON body from `API 409: {...}` client errors. */
export function soloConflictFromError(err: unknown): SoloConflictInfo | null {
  if (!(err instanceof Error)) return null;
  const match = /^API (\d+): (.*)$/s.exec(err.message);
  if (!match || match[1] !== '409') return null;
  return parseSoloConflictDetail(match[2] ?? '');
}

export type NewCampaignStartResult = {
  activeCampaignId: string;
  sessionId: string;
  characterName: string;
  campaignTemplateSlug: string;
  soloMode: boolean;
  recommendedPlayers: number;
};

/** Build /play search params from a successful start. */
export function playParamsFromStart(result: NewCampaignStartResult): string {
  return new URLSearchParams({
    campaignId: result.activeCampaignId,
    activeCampaignId: result.activeCampaignId,
    sessionId: result.sessionId,
    soloMode: result.soloMode ? '1' : '0',
    recommendedPlayers: String(result.recommendedPlayers),
    characterName: result.characterName,
    templateSlug: result.campaignTemplateSlug,
  }).toString();
}

/** Stable class order for prebuilt pickers (warrior → ranger → mage → bard). */
export const PREBUILT_CLASS_ORDER = [
  'warrior',
  'ranger',
  'mage',
  'bard',
] as const;

export function sortPrebuiltsByClass<T extends { class_id: string; sort_order?: number }>(
  prebuilts: T[],
): T[] {
  const rank = (classId: string) => {
    const i = (PREBUILT_CLASS_ORDER as readonly string[]).indexOf(classId);
    return i === -1 ? PREBUILT_CLASS_ORDER.length : i;
  };
  return [...prebuilts].sort((a, b) => {
    const byClass = rank(a.class_id) - rank(b.class_id);
    if (byClass !== 0) return byClass;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}
