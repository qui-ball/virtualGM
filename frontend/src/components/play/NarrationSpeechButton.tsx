import { useCallback, useEffect, useRef, useState } from 'react';
import { NarrationTtsDisclosureDialog } from '@/components/play/NarrationTtsDisclosureDialog';
import {
  NarrationTtsDisclosureRequiredError,
  acceptNarrationTtsDisclosure,
  narrationTtsDisclosureNeeded,
  startNarrationSpeech,
  type NarrationSpeechAttempt,
} from '@/lib/play/narrationTts';
import { cn } from '@/lib/utils';

type NarrationSpeechButtonProps = {
  entryId: string;
  text: string;
  className?: string;
};

type Phase = 'idle' | 'loading' | 'playing' | 'unavailable';

/** How long the control shows "unavailable" before returning to a retryable idle. */
const UNAVAILABLE_MS = 2400;

const LABEL_PREVIEW_CHARS = 48;

/** Distinguishes one bubble's control from the next for screen-reader users. */
function labelPreview(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  const clipped = normalized.slice(0, LABEL_PREVIEW_CHARS);
  return `: “${clipped}${normalized.length > LABEL_PREVIEW_CHARS ? '…' : ''}”`;
}

/**
 * Play control next to "Game Master". All playback state lives in
 * `@/lib/play/narrationTts`; this component only maps it to a button, a
 * disclosure dialog, and an assistive status message. Failures stay local here —
 * they never touch the transcript or game state (R8).
 */
export function NarrationSpeechButton({
  entryId,
  text,
  className,
}: NarrationSpeechButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const attemptRef = useRef<NarrationSpeechAttempt | null>(null);
  const unavailableTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Cancels a pending registration as readily as active playback (R3).
      attemptRef.current?.stop();
      attemptRef.current = null;
      if (unavailableTimer.current !== null) {
        window.clearTimeout(unavailableTimer.current);
      }
    };
  }, []);

  const cancelActive = useCallback(() => {
    attemptRef.current?.stop();
    attemptRef.current = null;
    setPhase('idle');
  }, []);

  const begin = useCallback(() => {
    if (unavailableTimer.current !== null) {
      window.clearTimeout(unavailableTimer.current);
      unavailableTimer.current = null;
    }
    setPhase('loading');

    const attempt = startNarrationSpeech(
      { entryId, text },
      {
        onPlaying: () => {
          if (mounted.current && attemptRef.current === attempt) {
            setPhase('playing');
          }
        },
      }
    );
    attemptRef.current = attempt;

    attempt.done.then(
      () => {
        if (attemptRef.current !== attempt) return;
        attemptRef.current = null;
        if (mounted.current) setPhase('idle');
      },
      (error: unknown) => {
        if (attemptRef.current !== attempt) return;
        attemptRef.current = null;
        if (!mounted.current) return;
        if (error instanceof NarrationTtsDisclosureRequiredError) {
          // Acceptance went stale between the click and the request.
          setPhase('idle');
          setDisclosureOpen(true);
          return;
        }
        setPhase('unavailable');
        unavailableTimer.current = window.setTimeout(() => {
          unavailableTimer.current = null;
          if (mounted.current) setPhase('idle');
        }, UNAVAILABLE_MS);
      }
    );
  }, [entryId, text]);

  const onClick = useCallback(() => {
    if (phase === 'loading' || phase === 'playing') {
      cancelActive();
      return;
    }
    if (!text.trim()) return;
    if (narrationTtsDisclosureNeeded()) {
      setDisclosureOpen(true);
      return;
    }
    begin();
  }, [phase, text, begin, cancelActive]);

  const onAccept = useCallback(() => {
    acceptNarrationTtsDisclosure();
    setDisclosureOpen(false);
    begin();
  }, [begin]);

  const onCancelDisclosure = useCallback(() => setDisclosureOpen(false), []);

  const preview = labelPreview(text);
  const label =
    phase === 'playing'
      ? `Stop narration audio${preview}`
      : phase === 'loading'
        ? `Stop loading narration audio${preview}`
        : phase === 'unavailable'
          ? `Narration audio unavailable, try again${preview}`
          : `Play narration aloud${preview}`;

  return (
    <>
      <button
        type="button"
        className={cn('play-narration-speech-btn', className)}
        data-phase={phase}
        aria-label={label}
        title={label}
        aria-pressed={phase === 'playing'}
        disabled={!text.trim()}
        onClick={onClick}
      >
        {phase === 'loading' ? (
          <span className="play-narration-speech-spinner" aria-hidden />
        ) : phase === 'unavailable' ? (
          <AlertGlyph />
        ) : phase === 'playing' ? (
          <StopGlyph />
        ) : (
          <PlayGlyph />
        )}
      </button>
      <span role="status" className="sr-only">
        {phase === 'unavailable'
          ? 'Narration audio unavailable. Try again.'
          : ''}
      </span>
      <NarrationTtsDisclosureDialog
        open={disclosureOpen}
        onAccept={onAccept}
        onCancel={onCancelDisclosure}
      />
    </>
  );
}

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[13px] shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9 6.2v11.6L18.5 12 9 6.2z" />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[12px] shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="12" r="5.5" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[13px] shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11 6.5h2v7h-2v-7zm0 9h2v2h-2v-2z" />
    </svg>
  );
}
