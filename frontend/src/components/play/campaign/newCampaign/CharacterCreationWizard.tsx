import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getRaces, getStartingPackages } from '@/api/client';
import type {
  CampaignTemplateSummary,
  CreateCharacterDraft,
  PackageSummary,
} from '@/types';
import { genderOptionLabel } from '@/components/play/campaign/newCampaign/OnboardingCharacterCard';
import {
  assignStat,
  formatStatModifier,
  formatWizardProgress,
  initialWizardDraft,
  isWizardComplete,
  nextWizardStep,
  packagePreviewLines,
  prevWizardStep,
  remainingStatValues,
  STAT_BLURBS,
  STAT_KEYS,
  STAT_POOL,
  toCreateCharacterDraft,
  validateWizardStep,
  WIZARD_CLASSES,
  WIZARD_RACES,
  type StatKey,
  type WizardDraft,
  type WizardRaceId,
  type WizardStepId,
} from '@/lib/play/characterWizard';
import { STAT_DISPLAY_LABELS } from '@/lib/play/statLabels';
import { cn } from '@/lib/utils';

export type CharacterCreationWizardHandle = {
  /** Move to previous wizard step. Returns false when already on the first step. */
  goBack: () => boolean;
  /** Advance or complete the current wizard step. */
  goNext: () => void;
  canContinue: boolean;
  continueLabel: string;
};

type CharacterCreationWizardProps = {
  template: CampaignTemplateSummary;
  /** Preserve draft when returning from confirm. */
  seed?: CreateCharacterDraft | null;
  onComplete: (
    draft: CreateCharacterDraft,
    packageLabel: string | null,
  ) => void;
};

type RaceOption = { id: WizardRaceId; label: string };

const STAT_SNAP_PX = 56;

export const CharacterCreationWizard = forwardRef<
  CharacterCreationWizardHandle,
  CharacterCreationWizardProps
>(function CharacterCreationWizard({ template, seed, onComplete }, ref) {
  const seededDraft = seed ? draftFromCreate(seed) : null;
  const [step, setStep] = useState<WizardStepId>(() =>
    seededDraft && isWizardComplete(seededDraft) ? 'package' : 'name',
  );
  const [draft, setDraft] = useState<WizardDraft>(
    () => seededDraft ?? initialWizardDraft(),
  );
  const [touched, setTouched] = useState(false);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [raceOptions, setRaceOptions] = useState<RaceOption[]>(WIZARD_RACES);
  const [racesError, setRacesError] = useState<string | null>(null);

  const stepError = touched ? validateWizardStep(step, draft) : null;
  const canAdvance = validateWizardStep(step, draft) == null;

  // Prefer API races when available; fall back to static list for offline POC.
  useEffect(() => {
    let cancelled = false;
    void getRaces()
      .then((res) => {
        if (cancelled || !res.races.length) return;
        const allowed = new Set(WIZARD_RACES.map((r) => r.id));
        const fromApi: RaceOption[] = res.races
          .filter((r) => allowed.has(r.id as WizardRaceId))
          .map((r) => ({
            id: r.id as WizardRaceId,
            label: r.name,
          }));
        if (!fromApi.length) return;
        setRaceOptions(fromApi);
        const ids = new Set(fromApi.map((r) => r.id));
        setDraft((d) =>
          d.race_id && !ids.has(d.race_id) ? { ...d, race_id: null } : d,
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRaceOptions(WIZARD_RACES);
          setRacesError(
            err instanceof Error ? err.message : 'Failed to load races',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draft.class_id) {
      setPackages([]);
      return;
    }
    let cancelled = false;
    setPackagesLoading(true);
    setPackagesError(null);
    void getStartingPackages(template.slug, draft.class_id)
      .then((res) => {
        if (cancelled) return;
        setPackages(res.packages);
        setDraft((d) => {
          const stillValid =
            d.starting_package_id &&
            res.packages.some((p) => p.id === d.starting_package_id);
          if (stillValid) return d;
          const first = res.packages[0];
          return {
            ...d,
            starting_package_id: first?.id ?? null,
          };
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPackagesError(
            err instanceof Error ? err.message : 'Failed to load packages',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [template.slug, draft.class_id]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === draft.starting_package_id) ?? null,
    [packages, draft.starting_package_id],
  );

  const progressLabel = useMemo(
    () =>
      formatWizardProgress(step, draft, (id) => {
        const hit = raceOptions.find((r) => r.id === id);
        return hit?.label ?? id;
      }),
    [step, draft, raceOptions],
  );

  const handleContinue = () => {
    setTouched(true);
    if (!canAdvance) return;
    const next = nextWizardStep(step);
    if (next) {
      setStep(next);
      setTouched(false);
      return;
    }
    try {
      const payload = toCreateCharacterDraft(
        draft,
        template.id,
        selectedPackage?.spells_known,
      );
      onComplete(payload, selectedPackage?.label ?? null);
    } catch {
      setTouched(true);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      goBack: () => {
        const prev = prevWizardStep(step);
        if (!prev) return false;
        setStep(prev);
        setTouched(false);
        return true;
      },
      goNext: handleContinue,
      canContinue: canAdvance && !(step === 'package' && packagesLoading),
      continueLabel: nextWizardStep(step) ? 'Continue' : 'Review character',
    }),
    [step, canAdvance, packagesLoading, handleContinue],
  );

  return (
    <div className="space-y-4">
      <p className="play-lbl text-[var(--accent)]">{progressLabel}</p>

      {step === 'name' ? (
        <NameStep
          value={draft.name}
          onChange={(name) => setDraft((d) => ({ ...d, name }))}
        />
      ) : null}

      {step === 'gender' ? (
        <ChoiceGrid
          label="Gender"
          options={[
            { id: 'female', label: genderOptionLabel('female') },
            { id: 'male', label: genderOptionLabel('male') },
          ]}
          selected={draft.gender}
          onSelect={(gender) =>
            setDraft((d) => ({ ...d, gender: gender as WizardDraft['gender'] }))
          }
        />
      ) : null}

      {step === 'class' ? (
        <ChoiceGrid
          label="Class"
          options={WIZARD_CLASSES.map((c) => ({ id: c.id, label: c.label }))}
          selected={draft.class_id}
          onSelect={(classId) =>
            setDraft((d) => ({
              ...d,
              class_id: classId as WizardDraft['class_id'],
              starting_package_id: null,
            }))
          }
        />
      ) : null}

      {step === 'race' ? (
        <>
          <ChoiceGrid
            label="Race"
            options={raceOptions.map((r) => ({ id: r.id, label: r.label }))}
            selected={draft.race_id}
            onSelect={(raceId) =>
              setDraft((d) => ({
                ...d,
                race_id: raceId as WizardDraft['race_id'],
              }))
            }
          />
          {racesError ? (
            <p className="text-xs text-[var(--ink-3)]">
              Using default races ({racesError}).
            </p>
          ) : null}
        </>
      ) : null}

      {step === 'stats' ? (
        <StatsDragStep
          stats={draft.stats}
          onAssign={(key, value) =>
            setDraft((d) => ({
              ...d,
              stats: assignStat(d.stats, key, value),
            }))
          }
        />
      ) : null}

      {step === 'package' ? (
        <PackageStep
          packages={packages}
          loading={packagesLoading}
          error={packagesError}
          selectedId={draft.starting_package_id}
          onSelect={(id) =>
            setDraft((d) => ({ ...d, starting_package_id: id }))
          }
        />
      ) : null}

      {stepError ? (
        <p className="text-sm text-[var(--bad)]" role="alert">
          {stepError}
        </p>
      ) : null}
    </div>
  );
});

function draftFromCreate(seed: CreateCharacterDraft): WizardDraft {
  return {
    name: seed.name,
    gender: seed.gender,
    class_id: seed.class_id,
    race_id: seed.race_id,
    stats: { ...seed.stats },
    starting_package_id: seed.starting_package_id,
  };
}

function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <section className="play-panel space-y-3 p-4">
      <label htmlFor={id} className="play-lbl">
        Character name
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        maxLength={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] rounded-[var(--radius-sm)] border border-[var(--panel-edge)] bg-[var(--panel)] px-3 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_var(--accent),var(--glow)]"
        placeholder="e.g. Mira Thorn"
      />
    </section>
  );
}

function ChoiceGrid({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="listbox"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="option"
          aria-selected={selected === opt.id}
          className={cn(
            'play-select-card flex min-h-[48px] items-center justify-center text-center',
            selected === opt.id && 'play-select-card-on',
          )}
          onClick={() => onSelect(opt.id)}
        >
          <span className="play-h-display text-base">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

type DragState = {
  value: number;
  from: 'pool' | StatKey;
  x: number;
  y: number;
  originX: number;
  originY: number;
};

function StatsDragStep({
  stats,
  onAssign,
}: {
  stats: WizardDraft['stats'];
  onAssign: (key: StatKey, value: number | null) => void;
}) {
  const remaining = remainingStatValues(stats);
  const slotRefs = useRef<Partial<Record<StatKey, HTMLDivElement | null>>>({});
  const poolRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hotSlot, setHotSlot] = useState<StatKey | null>(null);

  const findNearestSlot = (x: number, y: number): StatKey | null => {
    let best: StatKey | null = null;
    let bestDist = STAT_SNAP_PX;
    for (const key of STAT_KEYS) {
      const el = slotRefs.current[key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= bestDist) {
        bestDist = dist;
        best = key;
      }
    }
    return best;
  };

  const isOverPool = (x: number, y: number): boolean => {
    const el = poolRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 12;
    return (
      x >= r.left - pad &&
      x <= r.right + pad &&
      y >= r.top - pad &&
      y <= r.bottom + pad
    );
  };

  const beginDrag = (
    e: ReactPointerEvent,
    value: number,
    from: 'pool' | StatKey,
  ) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const next: DragState = {
      value,
      from,
      x: e.clientX,
      y: e.clientY,
      originX: e.clientX,
      originY: e.clientY,
    };
    dragRef.current = next;
    setDrag(next);
    setHotSlot(findNearestSlot(e.clientX, e.clientY));
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const next: DragState = {
      ...current,
      x: e.clientX,
      y: e.clientY,
    };
    dragRef.current = next;
    setDrag(next);
    setHotSlot(findNearestSlot(e.clientX, e.clientY));
  };

  const endDrag = (e: ReactPointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const { value, from, originX, originY } = current;
    const moved = Math.hypot(e.clientX - originX, e.clientY - originY) >= 8;

    if (!moved && from !== 'pool') {
      onAssign(from, null);
    } else {
      const nearest = findNearestSlot(e.clientX, e.clientY);
      if (nearest) {
        onAssign(nearest, value);
      } else if (from !== 'pool' && isOverPool(e.clientX, e.clientY)) {
        onAssign(from, null);
      }
    }
    dragRef.current = null;
    setDrag(null);
    setHotSlot(null);
  };

  const cancelDrag = () => {
    dragRef.current = null;
    setDrag(null);
    setHotSlot(null);
  };

  return (
    <section className="space-y-4" aria-label="Assign stats">
      <div className="space-y-1 text-sm text-[var(--ink-3)]">
        <p>Drag each modifier into a stat slot.</p>
        <p>Assign +2, +1, 0, and −1 once each.</p>
        <p>Tap a filled slot to return its value.</p>
      </div>

      <div
        ref={poolRef}
        className="grid grid-cols-4 gap-2"
        aria-label="Modifier pool"
      >
        {STAT_POOL.map((v) => {
          const available = remaining.includes(v);
          return (
            <div key={v} className="flex justify-center">
              {available ? (
                <button
                  type="button"
                  className={cn(
                    'play-stat-chip',
                    drag?.value === v && drag.from === 'pool' && 'opacity-30',
                  )}
                  aria-label={`Drag ${formatStatModifier(v)}`}
                  onPointerDown={(e) => beginDrag(e, v, 'pool')}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={cancelDrag}
                >
                  {formatStatModifier(v)}
                </button>
              ) : (
                <div className="play-stat-slot opacity-40" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {STAT_KEYS.map((key) => {
          const value = stats[key];
          return (
            <div key={key} className="min-w-0 space-y-1.5 text-center">
              <p className="play-lbl truncate">{STAT_DISPLAY_LABELS[key]}</p>
              <div
                ref={(el) => {
                  slotRefs.current[key] = el;
                }}
                className={cn(
                  'play-stat-slot',
                  value != null && 'play-stat-slot-filled',
                  hotSlot === key && 'play-stat-slot-hot',
                )}
              >
                {value != null ? (
                  <button
                    type="button"
                    className={cn(
                      'play-stat-chip',
                      drag?.from === key && 'opacity-30',
                    )}
                    aria-label={`${STAT_DISPLAY_LABELS[key]} ${formatStatModifier(value)}. Drag to move, or tap to clear.`}
                    onPointerDown={(e) => beginDrag(e, value, key)}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={cancelDrag}
                  >
                    {formatStatModifier(value)}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <ul className="space-y-1.5 rounded-[var(--r)] border border-[var(--panel-edge)] bg-[var(--panel)] px-3 py-2.5">
        {STAT_KEYS.map((key) => (
          <li key={key} className="text-xs leading-snug text-[var(--ink-3)]">
            <span className="font-medium text-[var(--ink-2)]">
              {STAT_DISPLAY_LABELS[key]}
            </span>
            {' — '}
            {STAT_BLURBS[key]}
          </li>
        ))}
      </ul>

      {drag ? (
        <div
          className="play-stat-chip play-stat-chip-ghost"
          style={{
            left: drag.x - 28,
            top: drag.y - 28,
          }}
          aria-hidden
        >
          {formatStatModifier(drag.value)}
        </div>
      ) : null}
    </section>
  );
}

function PackageStep({
  packages,
  loading,
  error,
  selectedId,
  onSelect,
}: {
  packages: PackageSummary[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return <p className="text-sm text-[var(--ink-3)]">Loading packages…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-[var(--bad)]" role="alert">
        {error}
      </p>
    );
  }
  if (!packages.length) {
    return (
      <p className="text-sm text-[var(--ink-3)]">
        No starting packages for this class.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3" role="listbox" aria-label="Starting package">
      {packages.map((pkg) => {
        const lines = packagePreviewLines(pkg);
        const isSelected = selectedId === pkg.id;
        return (
          <button
            key={pkg.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={cn(
              'play-select-card flex w-full flex-col gap-2 text-left',
              isSelected && 'play-select-card-on',
            )}
            onClick={() => onSelect(pkg.id)}
          >
            <h3 className="play-h-display text-lg">{pkg.label}</h3>
            {pkg.playstyle || pkg.theme ? (
              <p className="text-sm text-[var(--ink-3)]">
                {[pkg.theme, pkg.playstyle].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {lines.length ? (
              <ul className="space-y-0.5 text-xs text-[var(--ink-3)]">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
