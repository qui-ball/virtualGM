import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { cn } from '@/lib/utils';

const NOTES_KEY_PREFIX = 'vgm-sheet-notes-';
const NOTES_V2_KEY_PREFIX = 'vgm-sheet-notes-v2-';

export type PlayerNote = {
  id: string;
  title: string;
  body: string;
};

type FieldKey = 'title' | 'body';
type EditingCell = { noteId: string; field: FieldKey };

function notesStorageKey(characterName: string): string {
  return `${NOTES_KEY_PREFIX}${characterName.trim().toLowerCase()}`;
}

function notesV2StorageKey(characterName: string): string {
  return `${NOTES_V2_KEY_PREFIX}${characterName.trim().toLowerCase()}`;
}

function createNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyNote(): PlayerNote {
  return { id: createNoteId(), title: '', body: '' };
}

/** Load notes; migrates legacy single-string localStorage into one note. */
export function loadPlayerNotes(characterName: string): PlayerNote[] {
  try {
    const v2 = localStorage.getItem(notesV2StorageKey(characterName));
    if (v2) {
      const parsed = JSON.parse(v2) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (n): n is PlayerNote =>
              n != null &&
              typeof n === 'object' &&
              typeof (n as PlayerNote).id === 'string',
          )
          .map((n) => ({
            id: n.id,
            title: typeof n.title === 'string' ? n.title : '',
            body: typeof n.body === 'string' ? n.body : '',
          }));
      }
    }
    const legacy = localStorage.getItem(notesStorageKey(characterName));
    if (legacy && legacy.trim()) {
      return [{ id: createNoteId(), title: 'Notes', body: legacy }];
    }
  } catch {
    /* ignore */
  }
  return [emptyNote()];
}

export function persistPlayerNotes(
  characterName: string,
  notes: PlayerNote[],
): void {
  try {
    localStorage.setItem(
      notesV2StorageKey(characterName),
      JSON.stringify(notes),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function reorderNotes(
  notes: PlayerNote[],
  fromIndex: number,
  toIndex: number,
): PlayerNote[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= notes.length ||
    toIndex >= notes.length ||
    fromIndex === toIndex
  ) {
    return notes;
  }
  const next = [...notes];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function updateNoteInList(
  notes: PlayerNote[],
  id: string,
  patch: Partial<Pick<PlayerNote, 'title' | 'body'>>,
): PlayerNote[] {
  return notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
}

type SheetNotesTabProps = {
  characterName: string;
};

export function SheetNotesTab({ characterName }: SheetNotesTabProps) {
  const [notes, setNotes] = useState<PlayerNote[]>(() =>
    loadPlayerNotes(characterName),
  );
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draft, setDraft] = useState('');
  const [baseline, setBaseline] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(() => {
    setNotes(loadPlayerNotes(characterName));
    setEditing(null);
    setDeleteId(null);
  }, [characterName]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange?.(len, len);
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const { noteId, field } = editing;
    const next = updateNoteInList(notesRef.current, noteId, {
      [field]: draft,
    });
    setNotes(next);
    persistPlayerNotes(characterName, next);
    setEditing(null);
  }, [characterName, draft, editing]);

  const undoEdit = useCallback(() => {
    if (!editing) return;
    setDraft(baseline);
    setEditing(null);
  }, [baseline, editing]);

  const beginEdit = (noteId: string, field: FieldKey, value: string) => {
    if (editing) {
      const next = updateNoteInList(notesRef.current, editing.noteId, {
        [editing.field]: draft,
      });
      setNotes(next);
      persistPlayerNotes(characterName, next);
      notesRef.current = next;
    }
    setEditing({ noteId, field });
    setDraft(value);
    setBaseline(value);
  };

  const addNote = () => {
    const note = emptyNote();
    const next = [...notesRef.current, note];
    setNotes(next);
    persistPlayerNotes(characterName, next);
    notesRef.current = next;
    beginEdit(note.id, 'title', '');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const next = notesRef.current.filter((n) => n.id !== deleteId);
    const ensured = next.length > 0 ? next : [emptyNote()];
    setNotes(ensured);
    persistPlayerNotes(characterName, ensured);
    notesRef.current = ensured;
    if (editing?.noteId === deleteId) setEditing(null);
    setDeleteId(null);
  };

  const onDrop = (index: number) => {
    if (dragIndex == null) return;
    const next = reorderNotes(notesRef.current, dragIndex, index);
    setNotes(next);
    persistPlayerNotes(characterName, next);
    notesRef.current = next;
    setDragIndex(null);
    setDropIndex(null);
  };

  const onFieldBlur = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (
      next &&
      (e.currentTarget as HTMLElement)
        .closest('.play-sheet-note-cell')
        ?.contains(next)
    ) {
      return;
    }
    commitEdit();
  };

  const onDraftKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      undoEdit();
    }
    if (e.key === 'Enter' && editing?.field === 'title') {
      e.preventDefault();
      commitEdit();
    }
  };

  const deleteTarget = notes.find((n) => n.id === deleteId);

  return (
    <div className="play-sheet-tab-panel space-y-3">
      <div>
        <p className="play-lbl">Player notes</p>
        <p className="text-xs text-[var(--ink-3)]">
          Tap a field to edit · tap outside to save · drag ⋮⋮ to reorder.
          Saved on this device only.
        </p>
      </div>

      <ul className="space-y-3" aria-label="Player notes list">
        {notes.map((note, index) => (
          <li
            key={note.id}
            className={cn(
              'play-sheet-note-card rounded-[var(--r)] border border-[var(--panel-edge)] p-2',
              dropIndex === index &&
                dragIndex !== index &&
                'ring-1 ring-[var(--accent)]',
            )}
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              setDropIndex(index);
            }}
            onDrop={() => onDrop(index)}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <button
                type="button"
                className="play-sheet-note-handle cursor-grab touch-none px-1 text-[var(--ink-3)] active:cursor-grabbing"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                aria-label={`Reorder note ${index + 1}`}
                title="Drag to reorder"
              >
                ⋮⋮
              </button>

              <NoteField
                label={note.title.trim() || `Note ${index + 1} title`}
                editing={
                  editing?.noteId === note.id && editing.field === 'title'
                }
                display={note.title}
                placeholder={`Note ${index + 1} title`}
                draft={draft}
                inputRef={inputRef}
                multiline={false}
                onBeginEdit={() => beginEdit(note.id, 'title', note.title)}
                onDraftChange={setDraft}
                onBlur={onFieldBlur}
                onKeyDown={onDraftKeyDown}
                onUndo={(e) => {
                  e.preventDefault();
                  undoEdit();
                }}
              />

              <button
                type="button"
                className="shrink-0 px-2 text-xs text-[var(--ink-3)] hover:text-[var(--bad)]"
                onClick={() => setDeleteId(note.id)}
                aria-label={`Delete note ${index + 1}`}
              >
                Delete
              </button>
            </div>

            <NoteField
              label={
                note.title.trim()
                  ? `Body for ${note.title}`
                  : `Body for note ${index + 1}`
              }
              editing={
                editing?.noteId === note.id && editing.field === 'body'
              }
              display={note.body}
              placeholder="Loot, NPC names, reminders…"
              draft={draft}
              inputRef={inputRef}
              multiline
              onBeginEdit={() => beginEdit(note.id, 'body', note.body)}
              onDraftChange={setDraft}
              onBlur={onFieldBlur}
              onKeyDown={onDraftKeyDown}
              onUndo={(e) => {
                e.preventDefault();
                undoEdit();
              }}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="play-sheet-rest-btn w-full min-h-[40px] justify-center"
        onClick={addNote}
      >
        + Add note
      </button>

      {deleteId ? (
        <div
          className="play-modal-fullscreen play-surface"
          role="presentation"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="play-modal-fullscreen-inner max-h-[40%] max-w-md"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="border-b border-[var(--panel-edge)] px-4 py-3">
              <h2 id="delete-note-title" className="play-h-display text-base">
                Delete this note?
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {deleteTarget?.title.trim()
                  ? `“${deleteTarget.title.trim()}” will be removed.`
                  : 'This note will be removed.'}{' '}
                This cannot be undone.
              </p>
            </header>
            <div className="flex gap-2 p-4">
              <button
                type="button"
                className="play-sheet-rest-btn min-h-[44px] flex-1 justify-center"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="play-btn-primary min-h-[44px] flex-1"
                style={{ background: 'var(--bad)' }}
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type NoteFieldProps = {
  label: string;
  editing: boolean;
  display: string;
  placeholder: string;
  draft: string;
  multiline: boolean;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onBeginEdit: () => void;
  onDraftChange: (value: string) => void;
  onBlur: (e: FocusEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onUndo: (e: MouseEvent) => void;
};

function NoteField({
  label,
  editing,
  display,
  placeholder,
  draft,
  multiline,
  inputRef,
  onBeginEdit,
  onDraftChange,
  onBlur,
  onKeyDown,
  onUndo,
}: NoteFieldProps) {
  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          'play-sheet-note-cell play-sheet-note-cell-view min-w-0 flex-1 text-left',
          multiline && 'min-h-[88px] w-full',
        )}
        onClick={onBeginEdit}
        aria-label={`Edit ${label}`}
      >
        {display.trim() ? (
          <span className={cn(multiline && 'whitespace-pre-wrap')}>
            {display}
          </span>
        ) : (
          <span className="text-[var(--ink-3)]">{placeholder}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'play-sheet-note-cell play-sheet-note-cell-edit min-w-0 flex-1',
        multiline && 'w-full',
      )}
    >
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          className="px-2 py-0.5 text-xs text-[var(--ink-2)] underline-offset-2 hover:underline"
          onMouseDown={onUndo}
          onClick={onUndo}
        >
          Undo
        </button>
      </div>
      {multiline ? (
        <textarea
          ref={inputRef as RefObject<HTMLTextAreaElement>}
          className="play-sheet-notes-input min-h-[88px] w-full resize-y"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
        />
      ) : (
        <input
          ref={inputRef as RefObject<HTMLInputElement>}
          type="text"
          className="play-sheet-notes-input min-h-0 w-full px-2 py-1.5 text-sm font-medium"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
        />
      )}
    </div>
  );
}
