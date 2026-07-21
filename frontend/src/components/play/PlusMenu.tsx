import type { ReactNode } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import { combatBlockedReason, isActionAllowedInCombat } from '@/lib/play/combatActions';
import { PlayGlyph } from '@/components/play/PlayGlyph';
import { cn } from '@/lib/utils';

export type PlusMenuAction =
  | 'freeroll'
  | 'cast'
  | 'shortrest'
  | 'longrest'
  | 'item'
  | 'note';

type PlusMenuProps = {
  open: boolean;
  character: CharacterView;
  inCombat?: boolean;
  onAction: (action: PlusMenuAction) => void;
  onClose: () => void;
};

function PlusMenuItem({
  action,
  inCombat,
  className,
  onClick,
  children,
}: {
  action: PlusMenuAction;
  inCombat: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const blocked = inCombat && !isActionAllowedInCombat(action);
  const reason = blocked ? combatBlockedReason(action) : null;
  return (
    <button
      type="button"
      className={cn('play-plus-menu-item min-h-[44px]', className)}
      disabled={blocked}
      title={reason ?? undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PlusMenu({
  open,
  character,
  inCombat = false,
  onAction,
  onClose,
}: PlusMenuProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="play-plus-menu-backdrop"
        aria-label="Close actions menu"
        onClick={onClose}
      />
      <div
        className="play-plus-menu"
        role="dialog"
        aria-label="Composer actions"
      >
        <div className="grid grid-cols-2 gap-1.5">
          <PlusMenuItem
            action="freeroll"
            inCombat={inCombat}
            onClick={() => onAction('freeroll')}
          >
            <PlayGlyph name="freeroll" className="play-plus-menu-glyph" />
            Free roll
          </PlusMenuItem>
          {character.showMana ? (
            <PlusMenuItem
              action="cast"
              inCombat={inCombat}
              onClick={() => onAction('cast')}
            >
              <PlayGlyph name="cast" className="play-plus-menu-glyph" />
              Cast spell
            </PlusMenuItem>
          ) : null}
          <PlusMenuItem
            action="shortrest"
            inCombat={inCombat}
            onClick={() => onAction('shortrest')}
          >
            <PlayGlyph name="shortrest" className="play-plus-menu-glyph" />
            Short rest
            <span className="play-plus-menu-cost">t−1</span>
          </PlusMenuItem>
          <PlusMenuItem
            action="longrest"
            inCombat={inCombat}
            onClick={() => onAction('longrest')}
          >
            <PlayGlyph name="longrest" className="play-plus-menu-glyph" />
            Long rest
            <span className="play-plus-menu-cost">t−5</span>
          </PlusMenuItem>
          <PlusMenuItem
            action="item"
            inCombat={inCombat}
            onClick={() => onAction('item')}
          >
            <PlayGlyph name="item" className="play-plus-menu-glyph" />
            Use item
          </PlusMenuItem>
          <PlusMenuItem
            action="note"
            inCombat={inCombat}
            className={!character.showMana ? 'col-span-2' : undefined}
            onClick={() => onAction('note')}
          >
            <PlayGlyph name="note" className="play-plus-menu-glyph" />
            Note (OOC)
          </PlusMenuItem>
        </div>
        <p className="play-plus-menu-footer">
          most rolls flow from GM prompts in chat
        </p>
      </div>
    </>
  );
}
