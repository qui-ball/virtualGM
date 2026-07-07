import { useEffect, useId, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { formatCampaignAudience } from '@/lib/play/campaignMeta';
import { cn } from '@/lib/utils';

const LOST_MINE_TEMPLATE = {
  id: 'lost-mine',
  title: 'Lost Mine of Phandelver',
  recommendedPlayers: 4,
  levelMin: 1,
  levelMax: 5,
  avgLevel: 3,
} as const;

type NewCampaignModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate?: (options: {
    soloMode: boolean;
    campaignId: string;
    recommendedPlayers: number;
  }) => void;
};

export function NewCampaignModal({
  open,
  onClose,
  onCreate,
}: NewCampaignModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const soloToggleId = useId();
  const [soloMode, setSoloMode] = useState(true);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setSoloMode(true);
  }, [open]);

  if (!open) return null;

  const handleCreate = () => {
    onCreate?.({
      soloMode,
      campaignId: LOST_MINE_TEMPLATE.id,
      recommendedPlayers: LOST_MINE_TEMPLATE.recommendedPlayers,
    });
  };

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
            <p className="play-appbar-sub">Lost Mine · POC template</p>
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
              Pick a published adventure. More templates arrive with campaign
              management API.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Pill variant="tint">{LOST_MINE_TEMPLATE.title}</Pill>
              <span className="play-pill opacity-50">Custom</span>
              <span className="play-pill opacity-50">Import</span>
            </div>
            <p className="play-mono pt-1 text-[0.625rem] text-[var(--ink-3)]">
              {formatCampaignAudience(LOST_MINE_TEMPLATE)}
            </p>
          </section>

          <section className="play-panel space-y-3 p-4">
            <div>
              <p className="play-lbl">Solo mode</p>
              <h2 className="play-h-display text-lg">Easier encounters</h2>
              <p className="text-sm text-[var(--ink-3)]">
                Fewer enemies (1÷party size), lower stats, and easier DCs when
                you play alone. Turn off for a closer match to the published
                adventure.
              </p>
            </div>
            <button
              id={soloToggleId}
              type="button"
              role="switch"
              aria-checked={soloMode}
              className={cn(
                'flex w-full min-h-[44px] items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--panel-edge)] px-3 py-2 text-left',
                soloMode && 'border-[var(--accent)]/40 bg-[var(--accent)]/5',
              )}
              onClick={() => setSoloMode((on) => !on)}
            >
              <span className="text-sm font-medium text-[var(--ink)]">
                {soloMode ? 'Solo mode on' : 'Solo mode off'}
              </span>
              <span
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  soloMode ? 'bg-[var(--accent)]' : 'bg-[var(--ink-3)]/30',
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]',
                    soloMode ? 'left-[1.375rem]' : 'left-0.5',
                  )}
                />
              </span>
            </button>
          </section>

          <section className="play-panel space-y-2 p-4 opacity-80">
            <p className="play-lbl">Step 2</p>
            <h2 className="play-h-display text-lg">Character</h2>
            <p className="text-sm text-[var(--ink-3)]">
              Uses your active lobby hero (Aldric) until character pick is
              wired.
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
            onClick={handleCreate}
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
