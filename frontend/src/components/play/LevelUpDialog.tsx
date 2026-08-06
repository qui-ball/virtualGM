import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import {
  abilitiesForLevelPick,
  computeFixedHpGain,
  hitDieLabel,
  hitDieSides,
  rollHpGain,
  type HpGainMode,
  type LevelUpBonusKind,
  type LevelUpSelection,
} from '@/lib/play/levelUp';
import { formatSignedModifier } from '@/lib/play/stats';
import { xpToReachLevel } from '@/lib/play/xp';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';
import type { CharacterState } from '@/types';

type LevelUpDialogProps = {
  open: boolean;
  character: CharacterView;
  characterState: CharacterState;
  submitError?: string | null;
  onConfirm: (selection: LevelUpSelection) => void | Promise<boolean>;
};

type LevelUpOptionProps = {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
};

/** Selectable card without nested `<button>` (ability picks use inner buttons). */
function LevelUpOption({ selected, onSelect, children }: LevelUpOptionProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      className={cn(
        'play-level-up-option min-h-[44px] w-full cursor-pointer text-left',
        selected && 'play-level-up-option-on',
      )}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

export function LevelUpDialog({
  open,
  character,
  characterState,
  submitError = null,
  onConfirm,
}: LevelUpDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  const [step, setStep] = useState<1 | 2>(1);
  const [hpMode, setHpMode] = useState<HpGainMode>('fixed');
  const [rolledHp, setRolledHp] = useState<number | null>(null);
  const [bonus, setBonus] = useState<LevelUpBonusKind | null>(null);
  const [abilityId, setAbilityId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextLevel = characterState.level + 1;
  const hitSides = hitDieSides(characterState.character_class);
  const mightMod = characterState.stats.might;
  const fixedHp = computeFixedHpGain(hitSides, mightMod);
  const abilities = useMemo(
    () => abilitiesForLevelPick(characterState),
    [characterState],
  );
  const hasAbilities = abilities.length > 0;

  const xpThreshold = xpToReachLevel(nextLevel);
  const migSigned = formatSignedModifier(mightMod);

  if (!open) return null;

  const hpAmount =
    hpMode === 'fixed' ? fixedHp : (rolledHp ?? null);
  const canAdvanceHp =
    hpMode === 'fixed' || (hpMode === 'roll' && rolledHp != null);

  const canConfirmBonus =
    bonus === 'evasion' || (bonus === 'ability' && abilityId != null);

  const resetLocal = () => {
    setStep(1);
    setHpMode('fixed');
    setRolledHp(null);
    setBonus(null);
    setAbilityId(null);
  };

  const handleConfirm = async () => {
    if (hpAmount == null || !bonus || submitting) return;
    if (bonus === 'ability' && !abilityId) return;
    const selection: LevelUpSelection = {
      hp: { mode: hpMode, amount: hpAmount },
      bonus:
        bonus === 'ability' && abilityId
          ? { kind: 'ability', abilityId }
          : { kind: 'evasion' },
    };
    setSubmitting(true);
    try {
      const ok = await onConfirm(selection);
      if (ok === false) return;
      resetLocal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="play-modal-fullscreen play-surface" role="presentation">
      <div
        ref={dialogRef}
        className="play-modal-fullscreen-inner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
      >
        <header className="play-level-up-banner shrink-0">
          <p className="play-lbl">
            Celebration · step {step} of 2
          </p>
          <h1 id="level-up-title" className="play-h-display text-lg">
            {character.name} · Lv {characterState.level} → {nextLevel}
          </h1>
          {xpThreshold != null ? (
            <p className="play-mono mt-1 text-[0.6875rem] text-[var(--ink-2)]">
              XP {characterState.xp} / {xpThreshold} ✓
            </p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            {step === 1
              ? 'First, choose how your hit points increase (fixed average or roll).'
              : 'Next, pick your bonus: +1 Evasion' +
                (hasAbilities ? ' or a class ability' : '') +
                '.'}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {submitError ? (
            <p
              className="mb-3 rounded-md border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3 py-2 text-sm text-[var(--bad)]"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <p className="rounded-md border border-[var(--good)]/35 bg-[var(--good)]/10 px-3 py-2 text-sm text-[var(--ink)]">
                Every level-up includes an HP increase. Choose Fixed or Roll,
                then continue.
              </p>
              <div className="play-level-up-option play-level-up-option-on">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">① Hit points</span>
                  <Pill variant="tint">{migSigned} Mig</Pill>
                </div>
                <div className="mt-2 space-y-2">
                  <SegmentedControl
                    options={[
                      {
                        id: 'fixed' as const,
                        label: `Fixed (${hitDieLabel(characterState.character_class)}÷2 +Mig) = ${fixedHp}`,
                      },
                      {
                        id: 'roll' as const,
                        label: `Roll ${hitDieLabel(characterState.character_class)} + Mig`,
                      },
                    ]}
                    value={hpMode}
                    onChange={(id) => {
                      setHpMode(id);
                      setRolledHp(null);
                    }}
                    aria-label="HP gain mode"
                  />
                  {hpMode === 'roll' ? (
                    <button
                      type="button"
                      className="play-sheet-rest-btn w-full min-h-[44px] justify-center"
                      onClick={() =>
                        setRolledHp(rollHpGain(hitSides, mightMod))
                      }
                    >
                      {rolledHp != null
                        ? `Rolled +${rolledHp} HP`
                        : 'Roll hit die + Mig'}
                    </button>
                  ) : (
                    <p className="text-sm text-[var(--ink-2)]">
                      You will gain <strong>+{fixedHp} HP</strong>.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="play-btn-primary mt-2 w-full min-h-[48px]"
                disabled={!canAdvanceHp}
                onClick={() => setStep(2)}
              >
                Continue to bonus
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-md border border-[var(--good)]/35 bg-[var(--good)]/10 px-3 py-2 text-sm text-[var(--ink)]">
                HP locked in: <strong>+{hpAmount} HP</strong> (
                {hpMode === 'fixed' ? 'fixed' : 'rolled'}). Now choose{' '}
                <strong>one</strong> bonus below, then confirm.
              </p>

              <div
                className="space-y-3"
                role="radiogroup"
                aria-label="Level-up bonus — pick exactly one"
              >
                <LevelUpOption
                  selected={bonus === 'evasion'}
                  onSelect={() => {
                    setBonus('evasion');
                    setAbilityId(null);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">② Evasion</span>
                    <Pill variant="tint">+1</Pill>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    {characterState.evasion} → {characterState.evasion + 1}
                  </p>
                </LevelUpOption>

                {hasAbilities ? (
                  <LevelUpOption
                    selected={bonus === 'ability'}
                    onSelect={() => setBonus('ability')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        ② Class ability
                      </span>
                      <span className="play-mono text-[0.5625rem] text-[var(--ink-3)]">
                        {abilities.length} at Lv {nextLevel}
                      </span>
                    </div>
                    {bonus === 'ability' ? (
                      <div
                        className="mt-2 space-y-1.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {abilities.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className={cn(
                              'play-level-up-ability-pick w-full text-left',
                              abilityId === a.id &&
                                'play-level-up-ability-pick-on',
                            )}
                            onClick={() => setAbilityId(a.id)}
                          >
                            <span className="font-medium text-sm">{a.name}</span>
                            <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                              {a.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--ink-2)]">
                        Pick from your class table at Lv {nextLevel}.
                      </p>
                    )}
                  </LevelUpOption>
                ) : null}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="play-sheet-rest-btn min-h-[48px] flex-1 justify-center"
                  onClick={() => {
                    setStep(1);
                    setBonus(null);
                    setAbilityId(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="play-btn-primary min-h-[48px] flex-[1.4]"
                  disabled={!canConfirmBonus || submitting}
                  onClick={() => void handleConfirm()}
                >
                  {submitting ? 'Confirming…' : 'Confirm level-up'}
                </button>
              </div>
              <p className="play-lbl mt-2 text-center text-[var(--ink-4)]">
                Level-ups resolve after combat · HP + one bonus
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
