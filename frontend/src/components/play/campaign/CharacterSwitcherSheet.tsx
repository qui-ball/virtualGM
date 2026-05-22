import { useEffect, useRef } from 'react';
import type { LobbyCharacterOption } from '@/lib/play/campaignLobby';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type CharacterSwitcherSheetProps = {
  open: boolean;
  characters: LobbyCharacterOption[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function CharacterSwitcherSheet({
  open,
  characters,
  activeId,
  onSelect,
  onClose,
}: CharacterSwitcherSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="play-sheet-backdrop"
        aria-label="Close character switcher"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="play-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Switch character"
      >
        <div className="play-bottom-sheet-handle" aria-hidden />
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <h2 className="play-h-display text-base">Your heroes</h2>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Close"
            onClick={onClose}
          >
            <PlayIcon name="close" />
          </button>
        </div>
        <ul className="flex flex-col gap-2" role="listbox">
          {characters.map((c) => {
            const selected = c.id === activeId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'play-bottom-sheet-item min-h-[44px] w-full text-left',
                    selected && 'play-bottom-sheet-item-on',
                  )}
                  onClick={() => {
                    onSelect(c.id);
                    onClose();
                  }}
                >
                  <span
                    className="play-avat play-avat-you grid size-9 shrink-0 place-items-center text-sm"
                    aria-hidden
                  >
                    {c.monogram}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="play-h-display block truncate text-sm">
                      {c.view.name}
                    </span>
                    <span className="play-mono text-[0.625rem] tracking-widest text-[var(--ink-3)] uppercase">
                      {c.view.classLabel} · Lv {c.view.level}
                    </span>
                  </span>
                  {selected ? (
                    <Pill variant="tint">Active</Pill>
                  ) : (
                    <Pill>Select</Pill>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
