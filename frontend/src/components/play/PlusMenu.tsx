import type { CharacterView } from '@/lib/play/characterView';
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
  onAction: (action: PlusMenuAction) => void;
  onClose: () => void;
};

export function PlusMenu({
  open,
  character,
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
          <button
            type="button"
            className="play-plus-menu-item min-h-[44px]"
            onClick={() => onAction('freeroll')}
          >
            <PlayGlyph name="freeroll" className="play-plus-menu-glyph" />
            Free roll
          </button>
          {character.showMana ? (
            <button
              type="button"
              className="play-plus-menu-item min-h-[44px]"
              onClick={() => onAction('cast')}
            >
              <PlayGlyph name="cast" className="play-plus-menu-glyph" />
              Cast spell
            </button>
          ) : null}
          <button
            type="button"
            className="play-plus-menu-item min-h-[44px]"
            onClick={() => onAction('shortrest')}
          >
            <PlayGlyph name="shortrest" className="play-plus-menu-glyph" />
            Short rest
            <span className="play-plus-menu-cost">t−1</span>
          </button>
          <button
            type="button"
            className="play-plus-menu-item min-h-[44px]"
            onClick={() => onAction('longrest')}
          >
            <PlayGlyph name="longrest" className="play-plus-menu-glyph" />
            Long rest
            <span className="play-plus-menu-cost">t−5</span>
          </button>
          <button
            type="button"
            className="play-plus-menu-item min-h-[44px]"
            onClick={() => onAction('item')}
          >
            <PlayGlyph name="item" className="play-plus-menu-glyph" />
            Use item
          </button>
          <button
            type="button"
            className={cn(
              'play-plus-menu-item min-h-[44px]',
              !character.showMana && 'col-span-2',
            )}
            onClick={() => onAction('note')}
          >
            <PlayGlyph name="note" className="play-plus-menu-glyph" />
            Note (OOC)
          </button>
        </div>
        <p className="play-plus-menu-footer">
          most rolls flow from GM prompts in chat
        </p>
      </div>
    </>
  );
}
