import type { CharacterView } from '@/lib/play/characterView';
import { Pill } from '@/components/play/Pill';
import { StatChip } from '@/components/play/StatChip';
import { VitalBar } from '@/components/play/VitalBar';
import { cn } from '@/lib/utils';

type CharacterVitalsCardProps = {
  character: CharacterView;
  className?: string;
};

/** Lobby-style character summary with bars and stat chips. */
export function CharacterVitalsCard({
  character,
  className,
}: CharacterVitalsCardProps) {
  const wit = character.stats.find((s) => s.key === 'wit');

  return (
    <section
      className={cn('play-panel space-y-3 p-3', className)}
      aria-label={`${character.name} vitals`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="play-lbl">Character</p>
          <p className="play-h-display text-lg">{character.name}</p>
          <p className="play-mono mt-0.5 text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase">
            {character.classLabel} · Lv {character.level}
          </p>
        </div>
        {character.pendingLevelUp ? (
          <Pill variant="solid">Level up</Pill>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 flex items-center justify-between">
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
            <div className="mb-1 flex items-center justify-between">
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
            <div className="mb-1 flex items-center justify-between">
              <span className="play-lbl">Evasion</span>
              <span className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
                {character.evasion}
              </span>
            </div>
            <p className="play-mono text-[0.5625rem] text-[var(--ink-4)]">
              10 + Fin + armor
            </p>
          </div>
        )}
      </div>

      {character.xpNext != null ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
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

      <div className="grid grid-cols-4 gap-1.5">
        {character.stats.map((s) => (
          <StatChip
            key={s.key}
            label={s.short}
            value={s.signed}
            variant={s.key === 'wit' ? 'hot' : 'default'}
            ariaLabel={s.ariaLabel}
          />
        ))}
      </div>

      {wit && character.showMana ? (
        <p className="play-mono text-[0.5625rem] text-[var(--ink-4)]">
          Primary: Wit ({wit.signed})
        </p>
      ) : null}
    </section>
  );
}
