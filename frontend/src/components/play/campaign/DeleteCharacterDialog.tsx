import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { CampaignListItem } from '@/lib/play/campaignLobby';
import { characterInactiveLabel } from '@/lib/play/campaignLobby';

type DeleteCharacterDialogProps = {
  campaign: CampaignListItem | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirm permanently removing an inactive hero from the roster. */
export function DeleteCharacterDialog({
  campaign,
  busy,
  onCancel,
  onConfirm,
}: DeleteCharacterDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = campaign != null;
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, busy, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const label = characterInactiveLabel(campaign);

  return createPortal(
    <div className="play-boss-zero-overlay z-[70]" role="presentation">
      <div
        ref={dialogRef}
        className="play-boss-zero-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-character-title"
        aria-describedby="delete-character-desc"
      >
        <span className="play-lbl text-[var(--bad)]">Delete character</span>
        <h2 id="delete-character-title" className="play-h-display mt-1 text-lg">
          Remove {campaign.characterName}?
        </h2>
        <p id="delete-character-desc" className="mt-2 text-sm text-[var(--ink-3)]">
          {campaign.characterName} ({label}) will be removed from your roster.
          This cannot be undone.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            className="play-btn-ghost min-h-[44px] text-[var(--bad)]"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="button"
            className="play-btn-ghost min-h-[44px]"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
