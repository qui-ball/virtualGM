import { useEffect, useRef, useState } from 'react';
import {
  isPlayerCombatant,
  matchEnemyByInitiativeName,
} from '@/lib/play/initiativeHud';
import type { CharacterState, EnemyState } from '@/types';
import { cn } from '@/lib/utils';

type CombatantInspectPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  displayName: string;
  character: CharacterState | null;
  enemies: Record<string, EnemyState>;
  onClose: () => void;
};

export function CombatantInspectPopover({
  open,
  anchorRef,
  displayName,
  character,
  enemies,
  onClose,
}: CombatantInspectPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const isPc = isPlayerCombatant(displayName, character);
  const enemy = matchEnemyByInitiativeName(enemies, displayName);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null);
      return;
    }
    const place = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 16);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = rect.bottom + 8;
      setStyle({ left, top, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !style) return null;

  return (
    <div
      ref={panelRef}
      className={cn('play-combat-inspect')}
      role="dialog"
      aria-label={`${displayName} combat stats`}
      style={{
        left: style.left,
        top: style.top,
        width: style.width,
      }}
    >
      <p className="play-combat-inspect-name">{displayName}</p>
      {isPc && character ? (
        <ul className="play-combat-inspect-stats">
          <li>
            HP {character.hp}/{character.hp_max}
          </li>
          <li>Evasion {character.evasion}</li>
          {character.mana != null && character.mana_max != null ? (
            <li>
              MP {character.mana}/{character.mana_max}
            </li>
          ) : null}
          <li>
            Conditions{' '}
            {character.conditions.length > 0
              ? character.conditions.join(', ')
              : '—'}
          </li>
        </ul>
      ) : enemy ? (
        <ul className="play-combat-inspect-stats">
          <li>
            HP {enemy.hp}/{enemy.hp_max}
          </li>
          <li>Evasion {enemy.evasion}</li>
          <li>
            Conditions{' '}
            {enemy.conditions.length > 0 ? enemy.conditions.join(', ') : '—'}
          </li>
        </ul>
      ) : (
        <p className="play-combat-inspect-empty">Stats not available</p>
      )}
    </div>
  );
}
