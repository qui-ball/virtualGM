import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';

type NarrationTtsDisclosureDialogProps = {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

/**
 * Named-processor disclosure shown before the first narration is ever spoken.
 *
 * Cancel sends nothing. Accept is recorded against
 * `NARRATION_TTS_DISCLOSURE_VERSION`, so materially changing the processors, what
 * is sent, or this copy must bump that version and ask again (R11).
 */
export function NarrationTtsDisclosureDialog({
  open,
  onAccept,
  onCancel,
}: NarrationTtsDisclosureDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="play-modal-fullscreen z-[60]" role="presentation">
      <div
        ref={dialogRef}
        className="play-modal-fullscreen-inner"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="narration-tts-disclosure-title"
        aria-describedby="narration-tts-disclosure-desc"
      >
        <header className="play-appbar shrink-0">
          <div className="min-w-0 flex-1">
            <p className="play-lbl text-[var(--accent)]">Narration audio</p>
            <h1
              id="narration-tts-disclosure-title"
              className="play-appbar-title"
            >
              Read narration aloud?
            </h1>
          </div>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Cancel narration audio"
            onClick={onCancel}
          >
            <PlayIcon name="close" />
          </button>
        </header>

        <div
          id="narration-tts-disclosure-desc"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 text-sm text-[var(--ink-3)]"
        >
          <p>
            To speak a narration, this app sends{' '}
            <strong className="text-[var(--ink)]">
              only the text of the bubble you tap
            </strong>{' '}
            to <strong className="text-[var(--ink)]">ElevenLabs</strong> for
            speech synthesis.
          </p>
          <p>
            Nothing else goes with it — no account, session, character, dice, or
            game state. Narration you never play is never sent.
          </p>
          <p>
            ElevenLabs keeps a history of what it generates for this account by
            default. Read their current terms before accepting:
          </p>
          <ul className="space-y-2">
            <li>
              <a
                className="text-[var(--accent)] underline"
                href="https://elevenlabs.io/privacy-policy"
                target="_blank"
                rel="noreferrer noopener"
              >
                ElevenLabs privacy policy
              </a>{' '}
              ·{' '}
              <a
                className="text-[var(--accent)] underline"
                href="https://elevenlabs.io/terms-of-use"
                target="_blank"
                rel="noreferrer noopener"
              >
                terms of use
              </a>
            </li>
          </ul>
          <p className="text-xs">
            Processor list and links last reviewed 2026-08-18. If they change
            materially, this notice appears again.
          </p>
        </div>

        <footer className="shrink-0 space-y-2 border-t border-[var(--panel-edge)] p-4">
          <button
            type="button"
            className="play-btn-primary min-h-[44px] w-full"
            onClick={onAccept}
          >
            Accept and play
          </button>
          <button
            type="button"
            className="play-btn-ghost min-h-[44px] w-full"
            onClick={onCancel}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
