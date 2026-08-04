import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';

type SoloConflictDialogProps = {
  open: boolean;
  onContinueExisting: () => void;
  onReplace: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function SoloConflictDialog({
  open,
  onContinueExisting,
  onReplace,
  onCancel,
  busy,
}: SoloConflictDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, busy]);

  if (!open) return null;

  return (
    <div className="play-modal-fullscreen z-[60]" role="presentation">
      <div
        ref={dialogRef}
        className="play-modal-fullscreen-inner"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="solo-conflict-title"
        aria-describedby="solo-conflict-desc"
      >
        <header className="play-appbar shrink-0">
          <div className="min-w-0 flex-1">
            <p className="play-lbl text-[var(--accent)]">Solo campaign</p>
            <h1 id="solo-conflict-title" className="play-appbar-title">
              Solo already in progress
            </h1>
          </div>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Close"
            disabled={busy}
            onClick={onCancel}
          >
            <PlayIcon name="close" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6">
          <p id="solo-conflict-desc" className="text-sm text-[var(--ink-3)]">
            You already have a solo playthrough of this campaign. Continue that
            one, or replace it — replacing permanently deletes that solo
            playthrough. Other campaigns can still have their own solo runs.
          </p>
        </div>
        <footer className="shrink-0 space-y-2 border-t border-[var(--panel-edge)] p-4">
          <button
            type="button"
            className="play-btn-primary w-full min-h-[44px]"
            disabled={busy}
            onClick={onContinueExisting}
          >
            Continue existing solo
          </button>
          <button
            type="button"
            className="play-btn-ghost w-full min-h-[44px] text-[var(--bad)]"
            disabled={busy}
            onClick={onReplace}
          >
            Replace existing solo
          </button>
          <button
            type="button"
            className="play-btn-ghost w-full min-h-[44px]"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
