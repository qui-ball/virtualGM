import type { CharacterView } from '@/lib/play/characterView';
import { Pill } from '@/components/play/Pill';
import { VitalBar } from '@/components/play/VitalBar';
import { cn } from '@/lib/utils';

type ActiveCharacterCardProps = {
  character: CharacterView;
  monogram: string;
  onSwitch: () => void;
  className?: string;
};

export function ActiveCharacterCard({
  character,
  monogram,
  onSwitch,
  className,
}: ActiveCharacterCardProps) {
  return (
    <section
      className={cn('play-panel space-y-3 p-3', className)}
      aria-label="Active character"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="play-avat play-avat-you grid size-9 shrink-0 place-items-center text-sm"
            aria-hidden
          >
            {monogram}
          </span>
          <div className="min-w-0">
            <p className="play-h-display truncate text-base">{character.name}</p>
            <p className="play-mono text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase">
              {character.classLabel} · Lv {character.level}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="play-btn-pill-wrap shrink-0"
          onClick={onSwitch}
          aria-haspopup="dialog"
        >
          <Pill>Switch ▾</Pill>
        </button>
      </div>

      <div
        className={cn(
          'grid gap-3',
          character.showMana ? 'grid-cols-2' : 'grid-cols-2',
        )}
      >
        <div>
          <div className="mb-1 flex justify-between">
            <span className="play-lbl">HP</span>
            <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
              {character.hp}/{character.hpMax}
            </span>
          </div>
          <VitalBar
            value={character.hp}
            max={character.hpMax}
            kind="hp"
            aria-label={`Hit points ${character.hp} of ${character.hpMax}`}
          />
        </div>
        {character.showMana &&
        character.mana != null &&
        character.manaMax != null ? (
          <div>
            <div className="mb-1 flex justify-between">
              <span className="play-lbl">Mana</span>
              <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {character.mana}/{character.manaMax}
              </span>
            </div>
            <VitalBar
              value={character.mana}
              max={character.manaMax}
              kind="mp"
              aria-label={`Mana ${character.mana} of ${character.manaMax}`}
            />
          </div>
        ) : (
          <div>
            <div className="mb-1 flex justify-between">
              <span className="play-lbl">Evasion</span>
              <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {character.evasion}
              </span>
            </div>
            <p className="play-h-display text-lg leading-none">
              {character.evasion}
            </p>
            <p className="play-mono text-[0.5625rem] text-[var(--ink-4)]">
              10 + Fin + armor
            </p>
          </div>
        )}
      </div>

      {character.xpNext != null ? (
        <div>
          <div className="mb-1 flex justify-between">
            <span className="play-lbl">XP → Lv {character.level + 1}</span>
            <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
              {character.xp}/{character.xpNext}
            </span>
          </div>
          <VitalBar
            value={character.xp}
            max={character.xpNext}
            kind="xp"
            aria-label={`Experience ${character.xp} of ${character.xpNext}`}
          />
        </div>
      ) : null}

      {character.pendingLevelUp ? (
        <Pill variant="solid" className="w-fit">
          ↑ Pending level-up
        </Pill>
      ) : null}
    </section>
  );
}
