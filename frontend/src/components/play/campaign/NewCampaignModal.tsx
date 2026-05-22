import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';

type NewCampaignModalProps = {
  open: boolean;
  onClose: () => void;
};

export function NewCampaignModal({ open, onClose }: NewCampaignModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

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
    <div className="play-modal-fullscreen" role="presentation">
      <div
        ref={dialogRef}
        className="play-modal-fullscreen-inner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-campaign-title"
      >
        <header className="play-appbar shrink-0">
          <div className="min-w-0 flex-1">
            <p className="play-lbl text-[var(--accent)]">New campaign</p>
            <h1 id="new-campaign-title" className="play-appbar-title">
              Choose a path
            </h1>
            <p className="play-appbar-sub">Placeholder · API in WS-8</p>
          </div>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Close new campaign"
            onClick={onClose}
          >
            <PlayIcon name="close" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6">
          <section className="play-panel space-y-2 p-4">
            <p className="play-lbl">Step 1</p>
            <h2 className="play-h-display text-lg">Campaign template</h2>
            <p className="text-sm text-[var(--ink-3)]">
              Pick a published adventure or blank sandbox. Full-screen flow
              matches the wireframe; wiring lands with campaign management API.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Pill variant="tint">Lost Mine</Pill>
              <Pill>Custom</Pill>
              <span className="play-pill opacity-50">Import</span>
            </div>
          </section>

          <section className="play-panel space-y-2 p-4 opacity-80">
            <p className="play-lbl">Step 2</p>
            <h2 className="play-h-display text-lg">Character</h2>
            <p className="text-sm text-[var(--ink-3)]">
              Select an existing hero or roll a new one.
            </p>
          </section>

          <section className="play-panel space-y-2 p-4 opacity-60">
            <p className="play-lbl">Step 3</p>
            <h2 className="play-h-display text-lg">Confirm</h2>
            <p className="text-sm text-[var(--ink-3)]">
              Review chapter time budget and begin play.
            </p>
          </section>
        </div>

        <footer className="shrink-0 border-t border-[var(--panel-edge)] p-4">
          <button
            type="button"
            className={cn('play-btn-primary w-full min-h-[44px]')}
            disabled
            title="Coming soon"
          >
            Create campaign
          </button>
          <button
            type="button"
            className="play-btn-ghost mt-2 w-full min-h-[44px]"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
