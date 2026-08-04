import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  getCampaignTemplates,
  getPrebuiltCharacters,
  getStartingPackages,
  startActiveCampaign,
} from '@/api/client';
import { PlayIcon } from '@/components/play/PlayIcon';
import { CampaignTemplatePicker } from '@/components/play/campaign/newCampaign/CampaignTemplatePicker';
import { CharacterPathChooser } from '@/components/play/campaign/newCampaign/CharacterPathChooser';
import {
  CharacterCreationWizard,
  type CharacterCreationWizardHandle,
} from '@/components/play/campaign/newCampaign/CharacterCreationWizard';
import { PrebuiltCharacterPicker } from '@/components/play/campaign/newCampaign/PrebuiltCharacterPicker';
import { CampaignConfirmStep } from '@/components/play/campaign/newCampaign/CampaignConfirmStep';
import { SoloConflictDialog } from '@/components/play/campaign/newCampaign/SoloConflictDialog';
import {
  canGoBack,
  canGoNext,
  canStart,
  completeWizard,
  confirmCharacterName,
  goBack,
  goNext,
  initialNewCampaignFlowState,
  playParamsFromStart,
  selectPath,
  selectPrebuilt,
  selectTemplate,
  setGender,
  setSoloMode,
  soloConflictFromError,
  sortPrebuiltsByClass,
  stepTitle,
  type NewCampaignFlowState,
  type NewCampaignStartResult,
  type SoloConflictInfo,
} from '@/lib/play/newCampaignFlow';
import type {
  CampaignTemplateSummary,
  PrebuiltCharacterSummary,
  StartCampaignResponse,
} from '@/types';
import { cn } from '@/lib/utils';

export type { NewCampaignStartResult };
export { playParamsFromStart };

type NewCampaignFlowProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful start — parent navigates to /play. */
  onStarted: (result: NewCampaignStartResult) => void;
  /** Continue an existing solo from conflict dialog. */
  onContinueExisting: (
    activeCampaignId: string,
    sessionId?: string | null,
  ) => void;
};

export function NewCampaignFlow({
  open,
  onClose,
  onStarted,
  onContinueExisting,
}: NewCampaignFlowProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const wizardRef = useRef<CharacterCreationWizardHandle>(null);
  useFocusTrap(dialogRef, open);

  const [flow, setFlow] = useState<NewCampaignFlowState>(
    initialNewCampaignFlowState,
  );
  const [templates, setTemplates] = useState<CampaignTemplateSummary[]>([]);
  const [prebuilts, setPrebuilts] = useState<PrebuiltCharacterSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [prebuiltsLoading, setPrebuiltsLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [prebuiltsError, setPrebuiltsError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [soloConflict, setSoloConflict] = useState<SoloConflictInfo | null>(
    null,
  );
  const [confirmEquipment, setConfirmEquipment] = useState<string[]>([]);
  const [confirmPackageLabel, setConfirmPackageLabel] = useState<string | null>(
    null,
  );
  const [, setWizardTick] = useState(0);

  const reset = useCallback(() => {
    setFlow(initialNewCampaignFlowState());
    setPrebuilts([]);
    setPrebuiltsError(null);
    setStartError(null);
    setStarting(false);
    setSoloConflict(null);
    setConfirmEquipment([]);
    setConfirmPackageLabel(null);
  }, []);

  const handleFlowBack = useCallback(() => {
    if (flow.step === 'wizard') {
      if (wizardRef.current?.goBack()) return;
    }
    if (canGoBack(flow)) {
      setFlow((s) => goBack(s));
      return;
    }
    onClose();
  }, [flow, onClose]);

  useEffect(() => {
    if (!open) return;
    reset();
    setTemplatesLoading(true);
    setTemplatesError(null);
    void getCampaignTemplates()
      .then((res) => {
        setTemplates(res.templates);
        const first = res.templates[0];
        if (first) {
          setFlow((s) => (s.template ? s : selectTemplate(s, first)));
        }
      })
      .catch((err: unknown) =>
        setTemplatesError(
          err instanceof Error ? err.message : 'Failed to load templates',
        ),
      )
      .finally(() => setTemplatesLoading(false));
  }, [open, reset]);

  // FR-6.7.1: Escape = previous step; close only on step 1 (template).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || starting || soloConflict) return;
      e.preventDefault();
      handleFlowBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, starting, soloConflict, handleFlowBack]);

  // Load prebuilts when entering prebuilt step with a template
  useEffect(() => {
    if (!open || flow.step !== 'prebuilt' || !flow.template) return;
    const slug = flow.template.slug;
    setPrebuiltsLoading(true);
    setPrebuiltsError(null);
    void getPrebuiltCharacters(slug)
      .then((res) => {
        const sorted = sortPrebuiltsByClass(res.prebuilts);
        setPrebuilts(sorted);
        const first = sorted[0];
        if (first) {
          setFlow((s) =>
            s.prebuilt ? s : selectPrebuilt(s, first),
          );
        }
      })
      .catch((err: unknown) =>
        setPrebuiltsError(
          err instanceof Error ? err.message : 'Failed to load characters',
        ),
      )
      .finally(() => setPrebuiltsLoading(false));
  }, [open, flow.step, flow.template]);

  // Load starting gear for confirm summary (prebuilt package or create draft package).
  useEffect(() => {
    if (!open || flow.step !== 'confirm' || !flow.template) {
      setConfirmEquipment([]);
      if (flow.step !== 'confirm') setConfirmPackageLabel(null);
      return;
    }
    if (flow.path === 'create' && flow.draft) {
      setConfirmPackageLabel(flow.draftPackageLabel);
      const packageId = flow.draft.starting_package_id;
      void getStartingPackages(flow.template.slug, flow.draft.class_id).then(
        (res) => {
          const pkg = res.packages.find((p) => p.id === packageId);
          const items = [
            pkg?.equipped_weapon,
            pkg?.equipped_armor,
            ...(pkg?.inventory ?? []),
          ].filter((x): x is string => Boolean(x));
          setConfirmEquipment(items);
          if (pkg?.label) setConfirmPackageLabel(pkg.label);
        },
      );
      return;
    }
    if (flow.prebuilt?.default_package_id) {
      const classId = flow.prebuilt.class_id;
      const packageId = flow.prebuilt.default_package_id;
      void getStartingPackages(flow.template.slug, classId).then((res) => {
        const pkg = res.packages.find((p) => p.id === packageId);
        const items = [
          pkg?.equipped_weapon,
          pkg?.equipped_armor,
          ...(pkg?.inventory ?? []),
        ].filter((x): x is string => Boolean(x));
        setConfirmEquipment(items);
        setConfirmPackageLabel(pkg?.label ?? null);
      });
    }
  }, [
    open,
    flow.step,
    flow.template,
    flow.path,
    flow.draft,
    flow.draftPackageLabel,
    flow.prebuilt,
  ]);

  const runStart = async (replaceExistingSolo: boolean) => {
    if (!flow.template || !canStart(flow)) return;
    setStarting(true);
    setStartError(null);
    try {
      const character =
        flow.path === 'create' && flow.draft
          ? { source: 'inline' as const, payload: flow.draft }
          : flow.prebuilt
            ? {
                source: 'prebuilt' as const,
                prebuilt_character_id: flow.prebuilt.id,
                gender: flow.gender,
              }
            : null;
      if (!character) return;

      const res: StartCampaignResponse = await startActiveCampaign({
        campaign_template_slug: flow.template.slug,
        solo_mode: flow.soloMode,
        ...(replaceExistingSolo ? { replace_existing_solo: true } : {}),
        character,
      });
      setSoloConflict(null);
      onStarted({
        activeCampaignId: res.active_campaign_id,
        sessionId: res.session_id,
        characterName: res.character_name,
        campaignTemplateSlug: res.campaign_template_slug,
        soloMode: flow.soloMode,
        recommendedPlayers: flow.template.recommended_players,
      });
    } catch (err) {
      const conflict = soloConflictFromError(err);
      if (conflict) {
        setSoloConflict(conflict);
      } else {
        setStartError(
          err instanceof Error ? err.message : 'Failed to start campaign',
        );
      }
    } finally {
      setStarting(false);
    }
  };

  if (!open) return null;

  const subtitle = flow.template?.name ?? 'Pick a published adventure';
  const onWizard = flow.step === 'wizard';

  return (
    <div className="play-modal-fullscreen" role="presentation">
      <div
        ref={dialogRef}
        className="play-modal-fullscreen-inner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-campaign-title"
      >
        <header className="play-appbar shrink-0">
          <div className="min-w-0 flex-1">
            <p className="play-lbl text-[var(--accent)]">New campaign</p>
            <h1 id="new-campaign-title" className="play-appbar-title">
              {stepTitle(flow.step)}
            </h1>
            <p className="play-appbar-sub truncate">{subtitle}</p>
          </div>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Close new campaign"
            disabled={starting}
            onClick={onClose}
          >
            <PlayIcon name="close" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6">
          {flow.step === 'template' ? (
            <CampaignTemplatePicker
              templates={templates}
              selectedSlug={flow.template?.slug ?? null}
              loading={templatesLoading}
              error={templatesError}
              onSelect={(t) => setFlow((s) => selectTemplate(s, t))}
            />
          ) : null}

          {flow.step === 'path' ? (
            <CharacterPathChooser
              selected={flow.path}
              onSelect={(path) => setFlow((s) => selectPath(s, path))}
            />
          ) : null}

          {flow.step === 'prebuilt' && flow.template ? (
            <PrebuiltCharacterPicker
              templateSlug={flow.template.slug}
              prebuilts={prebuilts}
              selectedId={flow.prebuilt?.id ?? null}
              gender={flow.gender}
              loading={prebuiltsLoading}
              error={prebuiltsError}
              onSelect={(p) => setFlow((s) => selectPrebuilt(s, p))}
              onGenderChange={(g) => setFlow((s) => setGender(s, g))}
            />
          ) : null}

          {flow.step === 'wizard' && flow.template ? (
            <CharacterCreationWizard
              ref={wizardRef}
              template={flow.template}
              seed={flow.draft}
              onComplete={(draft, packageLabel) => {
                setFlow((s) => completeWizard(s, draft, packageLabel));
                setWizardTick((n) => n + 1);
              }}
            />
          ) : null}

          {flow.step === 'confirm' &&
          flow.template &&
          (flow.prebuilt || flow.draft) ? (
            <CampaignConfirmStep
              template={flow.template}
              prebuilt={flow.prebuilt}
              draft={flow.draft}
              packageLabel={confirmPackageLabel ?? flow.draftPackageLabel}
              equipment={confirmEquipment}
              gender={flow.gender}
              soloMode={flow.soloMode}
              onSoloModeChange={(solo) =>
                setFlow((s) => setSoloMode(s, solo))
              }
              starting={starting}
              error={startError}
            />
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--panel-edge)] p-4">
          {canGoBack(flow) || onWizard ? (
            <button
              type="button"
              className="play-btn-ghost min-h-[44px] min-w-[5.5rem] shrink-0"
              disabled={starting}
              onClick={handleFlowBack}
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              className="play-btn-ghost min-h-[44px] min-w-[5.5rem] shrink-0"
              disabled={starting}
              onClick={onClose}
            >
              Cancel
            </button>
          )}

          {flow.step === 'confirm' ? (
            <button
              type="button"
              className={cn('play-btn-primary min-h-[44px] flex-1')}
              disabled={starting || !canStart(flow)}
              onClick={() => void runStart(false)}
            >
              {starting
                ? 'Starting…'
                : `Start as ${confirmCharacterName(flow)}`}
            </button>
          ) : onWizard ? (
            <button
              type="button"
              className={cn('play-btn-primary min-h-[44px] flex-1')}
              disabled={starting}
              onClick={() => {
                wizardRef.current?.goNext();
                setWizardTick((n) => n + 1);
              }}
            >
              {wizardRef.current?.continueLabel ?? 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              className={cn('play-btn-primary min-h-[44px] flex-1')}
              disabled={!canGoNext(flow)}
              onClick={() => setFlow((s) => goNext(s))}
            >
              Continue
            </button>
          )}
        </footer>
      </div>

      <SoloConflictDialog
        open={soloConflict != null}
        busy={starting}
        onCancel={() => setSoloConflict(null)}
        onContinueExisting={() => {
          if (!soloConflict) return;
          onContinueExisting(
            soloConflict.existing_campaign_id,
            soloConflict.session_id,
          );
        }}
        onReplace={() => void runStart(true)}
      />
    </div>
  );
}
