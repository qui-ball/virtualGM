import { useCallback, useRef, useState } from 'react';
import { CombatantInspectPopover } from '@/components/play/CombatantInspectPopover';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { useInitiativeQueueFlip } from '@/hooks/useInitiativeQueueFlip';
import {
  buildInitiativeSlots,
  turnIndicatorLabel,
  type InitiativeSlot,
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
  const turnLabel = turnIndicatorLabel(initiativeOrder, currentTurnIndex);
  const slots = buildInitiativeSlots(
    initiativeOrder,
    currentTurnIndex,
    character,
    enemies,
  );
  const orderKey = slots.map((s) => s.name).join('|');

  const {
    scrollRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    consumeWasDrag,
  } = useHorizontalDragScroll();
  const flipRef = useInitiativeQueueFlip(orderKey);

  const setHudRef = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el;
      flipRef.current = el;
    },
    [scrollRef, flipRef],
  );

  const [inspectName, setInspectName] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  anchorRef.current = anchorEl;

  if (slots.length === 0) return null;

  return (
    <>
      <div
        ref={setHudRef}
        className="play-initiative-hud"
        role="list"
        aria-label={
          turnLabel ? `Initiative order, ${turnLabel}` : 'Initiative order'
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {slots.map((slot) => (
          <InitiativePortrait
            key={slot.name}
            slot={slot}
            buttonRef={(el) => {
              chipRefs.current[slot.name] = el;
            }}
            onOpen={() => {
              if (consumeWasDrag()) return;
              setInspectName(slot.name);
              setAnchorEl(chipRefs.current[slot.name] ?? null);
            }}
          />
        ))}
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

type InitiativePortraitProps = {
  slot: InitiativeSlot;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onOpen: () => void;
};

function InitiativePortrait({
  slot,
  buttonRef,
  onOpen,
}: InitiativePortraitProps) {
  return (
    <button
      type="button"
      ref={buttonRef}
      role="listitem"
      data-initiative-id={slot.name}
      aria-current={slot.active ? 'step' : undefined}
      aria-label={
        slot.active ? `${slot.name}, current turn` : slot.name
      }
      title={slot.name}
      className={cn(
        'play-initiative-tile',
        slot.active && 'play-initiative-tile-active',
        slot.acted && 'play-initiative-tile-acted',
        slot.kind === 'pc' && 'play-initiative-tile-pc',
        slot.kind === 'enemy' && 'play-initiative-tile-enemy',
      )}
      onClick={onOpen}
    >
      <span className="play-initiative-thumb" aria-hidden>
        <span className="play-initiative-monogram">{slot.monogram}</span>
        {slot.active ? (
          <span className="play-initiative-turn-pip" />
        ) : null}
      </span>
      <span className="play-initiative-name">{slot.name}</span>
    </button>
  );
}
