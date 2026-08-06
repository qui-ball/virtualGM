import { InitiativeHud } from '@/components/play/InitiativeHud';
import { turnIndicatorLabel } from '@/lib/play/initiativeHud';
import type { CharacterState, EnemyState } from '@/types';

type CombatStripProps = {
  initiativeOrder: string[];
  currentTurnIndex: number;
  character: CharacterState | null;
  enemies: Record<string, EnemyState>;
};

export function CombatStrip({
  initiativeOrder,
  currentTurnIndex,
  character,
  enemies,
}: CombatStripProps) {
  const turnLabel = turnIndicatorLabel(initiativeOrder, currentTurnIndex);

  return (
    <section className="play-combat-strip shrink-0" aria-label="Combat">
      <div className="play-combat-strip-head">
        <p className="play-combat-mode-label play-lbl">In combat</p>
        {turnLabel ? (
          <p className="play-combat-turn-label play-mono">{turnLabel}</p>
        ) : null}
      </div>
      <InitiativeHud
        initiativeOrder={initiativeOrder}
        currentTurnIndex={currentTurnIndex}
        character={character}
        enemies={enemies}
      />
    </section>
  );
}
