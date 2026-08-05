import { useCallback, useEffect, useState } from 'react';
import { playNarrationSpeech } from '@/lib/play/narrationTts';
import { cn } from '@/lib/utils';

type NarrationSpeechButtonProps = {
  entryId: string;
  text: string;
  className?: string;
};

/**
 * Play control next to "Game Master". Hooks the future TTS API via
 * {@link playNarrationSpeech}; failures stay local to the button.
 */
export function NarrationSpeechButton({
  entryId,
  text,
  className,
}: NarrationSpeechButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing' | 'unavailable'>(
    'idle',
  );
  const [stopper, setStopper] = useState<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopper?.();
    };
  }, [stopper]);

  const onClick = useCallback(async () => {
    if (phase === 'playing') {
      stopper?.();
      setStopper(null);
      setPhase('idle');
      return;
    }
    if (phase === 'loading' || !text.trim()) return;

    setPhase('loading');
    try {
      const handle = await playNarrationSpeech({ entryId, text });
      setStopper(() => handle.stop);
      setPhase('playing');
      await handle.done;
      setStopper(null);
      setPhase('idle');
    } catch {
      setStopper(null);
      setPhase('unavailable');
      window.setTimeout(() => setPhase('idle'), 1600);
    }
  }, [entryId, text, phase, stopper]);

  const label =
    phase === 'playing'
      ? 'Stop narration audio'
      : phase === 'loading'
        ? 'Loading narration audio'
        : phase === 'unavailable'
          ? 'Narration audio not available yet'
          : 'Play narration aloud';

  return (
    <button
      type="button"
      className={cn('play-narration-speech-btn', className)}
      aria-label={label}
      title={label}
      aria-pressed={phase === 'playing'}
      disabled={phase === 'loading' || !text.trim()}
      onClick={() => void onClick()}
    >
      {phase === 'loading' ? (
        <span className="play-narration-speech-spinner" aria-hidden />
      ) : phase === 'playing' ? (
        <StopGlyph />
      ) : (
        <PlayGlyph />
      )}
    </button>
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
