import { useRef, useState } from 'react';
import { CombatantInspectPopover } from '@/components/play/CombatantInspectPopover';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import {
  activeCombatantName,
  turnIndicatorLabel,
} from '@/lib/play/initiativeHud';
import type { CharacterState, EnemyState } from '@/types';
import { cn } from '@/lib/utils';

type InitiativeHudProps = {
  initiativeOrder: string[];
  currentTurnIndex: number;
  character: CharacterState | null;
  enemies: Record<string, EnemyState>;
};

export function InitiativeHud({
  initiativeOrder,
  currentTurnIndex,
  character,
  enemies,
}: InitiativeHudProps) {
  const activeName = activeCombatantName(initiativeOrder, currentTurnIndex);
  const turnLabel = turnIndicatorLabel(initiativeOrder, currentTurnIndex);
  const {
    scrollRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    consumeWasDrag,
  } = useHorizontalDragScroll();

  const [inspectName, setInspectName] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  anchorRef.current = anchorEl;

  if (initiativeOrder.length === 0) return null;

  return (
    <>
      <div className="play-combat-strip-head">
        <span className="play-lbl">Initiative order</span>
        {turnLabel ? (
          <span className="play-combat-turn-label play-mono">{turnLabel}</span>
        ) : null}
      </div>
      <div
        ref={scrollRef}
        className="play-initiative-hud"
        role="list"
        aria-label={
          turnLabel
            ? `Initiative order, ${turnLabel}`
            : 'Initiative order'
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {initiativeOrder.map((name) => {
          const isActive = name === activeName;
          return (
            <button
              key={name}
              type="button"
              ref={(el) => {
                chipRefs.current[name] = el;
              }}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'play-initiative-chip min-h-[36px]',
                isActive && 'play-initiative-chip-active',
              )}
              onClick={() => {
                if (consumeWasDrag()) return;
                setInspectName(name);
                setAnchorEl(chipRefs.current[name] ?? null);
              }}
            >
              {isActive ? (
                <span className="play-initiative-chip-turn-marker" aria-hidden>
                  ▶
                </span>
              ) : null}
              {name}
            </button>
          );
        })}
      </div>

      <CombatantInspectPopover
        open={inspectName != null}
        anchorRef={anchorRef}
        displayName={inspectName ?? ''}
        character={character}
        enemies={enemies}
        onClose={() => {
          setInspectName(null);
          setAnchorEl(null);
        }}
      />
    </>
  );
}
