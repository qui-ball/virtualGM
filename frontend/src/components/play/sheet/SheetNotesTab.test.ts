import { describe, expect, it } from 'vitest';
import {
  emptyNote,
  reorderNotes,
  updateNoteInList,
  type PlayerNote,
} from '@/components/play/sheet/SheetNotesTab';

function note(id: string, title: string): PlayerNote {
  return { id, title, body: '' };
}

describe('reorderNotes', () => {
  it('moves a note to a new index', () => {
    const notes = [note('a', 'A'), note('b', 'B'), note('c', 'C')];
    expect(reorderNotes(notes, 0, 2).map((n) => n.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('no-ops on invalid indexes', () => {
    const notes = [note('a', 'A'), emptyNote()];
    expect(reorderNotes(notes, -1, 0)).toBe(notes);
    expect(reorderNotes(notes, 0, 0)).toBe(notes);
  });
});

describe('updateNoteInList', () => {
  it('patches a single note by id', () => {
    const notes = [note('a', 'A'), note('b', 'B')];
    expect(updateNoteInList(notes, 'b', { body: 'loot' })).toEqual([
      note('a', 'A'),
      { id: 'b', title: 'B', body: 'loot' },
    ]);
  });
});
