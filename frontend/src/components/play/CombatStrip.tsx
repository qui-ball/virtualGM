import { InitiativeHud } from '@/components/play/InitiativeHud';
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
  return (
    <section className="play-combat-strip shrink-0" aria-label="Combat">
      <p className="play-combat-mode-label play-lbl">In combat</p>
      <InitiativeHud
        initiativeOrder={initiativeOrder}
        currentTurnIndex={currentTurnIndex}
        character={character}
        enemies={enemies}
      />
    </section>
  );
}
