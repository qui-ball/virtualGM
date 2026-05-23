import { useMemo, useRef, useState } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import {
  abilitiesForLevelPick,
  computeFixedHpGain,
  hitDieLabel,
  hitDieSides,
  rollHpGain,
  type HpGainMode,
  type LevelUpChoiceKind,
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
  onConfirm: (selection: LevelUpSelection) => void;
};

const CHOICE_OPTIONS: { id: LevelUpChoiceKind; label: string }[] = [
  { id: 'hp', label: 'HP' },
  { id: 'evasion', label: 'Evasion' },
  { id: 'ability', label: 'Ability' },
];

export function LevelUpDialog({
  open,
  character,
  characterState,
  onConfirm,
}: LevelUpDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  const [choice, setChoice] = useState<LevelUpChoiceKind | null>(null);
  const [hpMode, setHpMode] = useState<HpGainMode>('fixed');
  const [rolledHp, setRolledHp] = useState<number | null>(null);
  const [abilityId, setAbilityId] = useState<string | null>(null);

  const nextLevel = characterState.level + 1;
  const hitSides = hitDieSides(characterState.character_class);
  const mightMod = characterState.stats.might;
  const fixedHp = computeFixedHpGain(hitSides, mightMod);
  const abilities = useMemo(
    () => abilitiesForLevelPick(characterState),
    [characterState],
  );

  const xpThreshold = xpToReachLevel(nextLevel);
  const migSigned = formatSignedModifier(mightMod);

  if (!open) return null;

  const buildSelection = (): LevelUpSelection | null => {
    if (choice === 'hp') {
      const amount =
        hpMode === 'fixed'
          ? fixedHp
          : (rolledHp ?? rollHpGain(hitSides, mightMod));
      return { kind: 'hp', mode: hpMode, amount };
    }
    if (choice === 'evasion') {
      return { kind: 'evasion' };
    }
    if (choice === 'ability' && abilityId) {
      return { kind: 'ability', abilityId };
    }
    return null;
  };

  const selection = buildSelection();
  const canConfirm =
    choice === 'evasion' ||
    (choice === 'hp' && (hpMode === 'fixed' || rolledHp != null)) ||
    (choice === 'ability' && abilityId != null);

  const handleConfirm = () => {
    if (!selection) return;
    onConfirm(selection);
    setChoice(null);
    setHpMode('fixed');
    setRolledHp(null);
    setAbilityId(null);
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
          <p className="play-lbl">Level-up · pick one</p>
          <h1 id="level-up-title" className="play-h-display text-lg">
            {character.name} · Lv {characterState.level} → {nextLevel}
          </h1>
          {xpThreshold != null ? (
            <p className="play-mono mt-1 text-[0.6875rem] text-[var(--ink-2)]">
              XP {characterState.xp} / {xpThreshold} ✓
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-3">
            <button
              type="button"
              className={cn(
                'play-level-up-option min-h-[44px] w-full text-left',
                choice === 'hp' && 'play-level-up-option-on',
              )}
              onClick={() => setChoice('hp')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">① HP</span>
                <Pill variant="tint">{migSigned} Mig</Pill>
              </div>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                Choose Fixed or Roll.
              </p>
              {choice === 'hp' ? (
                <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
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
                  ) : null}
                </div>
              ) : null}
            </button>

            <button
              type="button"
              className={cn(
                'play-level-up-option min-h-[44px] w-full text-left',
                choice === 'evasion' && 'play-level-up-option-on',
              )}
              onClick={() => setChoice('evasion')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">② Evasion</span>
                <Pill variant="tint">+1</Pill>
              </div>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {characterState.evasion} → {characterState.evasion + 1}
              </p>
            </button>

            <button
              type="button"
              className={cn(
                'play-level-up-option min-h-[44px] w-full text-left',
                choice === 'ability' && 'play-level-up-option-on',
              )}
              onClick={() => setChoice('ability')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">③ Class ability</span>
                <span className="play-mono text-[0.5625rem] text-[var(--ink-3)]">
                  {abilities.length} at Lv {nextLevel}
                </span>
              </div>
              {choice === 'ability' ? (
                <div
                  className="mt-2 space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {abilities.length === 0 ? (
                    <p className="text-sm text-[var(--ink-3)]">
                      No catalog abilities at this level — confirm another
                      choice or pick from sheet when API ships.
                    </p>
                  ) : (
                    abilities.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={cn(
                          'play-level-up-ability-pick w-full text-left',
                          abilityId === a.id && 'play-level-up-ability-pick-on',
                        )}
                        onClick={() => setAbilityId(a.id)}
                      >
                        <span className="font-medium text-sm">{a.name}</span>
                        <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                          {a.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-[var(--ink-2)]">
                  Pick from your class table at Lv {nextLevel}.
                </p>
              )}
            </button>
          </div>

          <button
            type="button"
            className="play-btn-primary mt-4 w-full min-h-[48px]"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm choice
          </button>
          <p className="play-lbl mt-3 text-center text-[var(--ink-4)]">
            Level-ups happen outside battle · confirm required
          </p>
        </div>
      </div>
    </div>
  );
}
