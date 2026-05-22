import { useEffect, useState } from 'react';

const NOTES_KEY_PREFIX = 'vgm-sheet-notes-';

function notesStorageKey(characterName: string): string {
  return `${NOTES_KEY_PREFIX}${characterName.trim().toLowerCase()}`;
}

type SheetNotesTabProps = {
  characterName: string;
};

export function SheetNotesTab({ characterName }: SheetNotesTabProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(notesStorageKey(characterName));
      setNotes(stored ?? '');
    } catch {
      setNotes('');
    }
  }, [characterName]);

  const persist = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem(notesStorageKey(characterName), value);
    } catch {
      /* ignore quota / private mode */
    }
  };

  return (
    <div className="play-sheet-tab-panel space-y-2">
      <p className="play-lbl">Player notes</p>
      <p className="text-xs text-[var(--ink-3)]">
        Saved on this device only. Not sent to the GM.
      </p>
      <textarea
        className="play-sheet-notes-input min-h-[120px] w-full resize-y"
        value={notes}
        onChange={(e) => persist(e.target.value)}
        placeholder="Loot, NPC names, reminders…"
        aria-label="Player notes"
      />
    </div>
  );
}
