import { useEffect, useRef } from 'react';
import { NarrationBody } from '@/components/play/NarrationBody';
import { NarrationSpeechButton } from '@/components/play/NarrationSpeechButton';
import { useTypewriterReveal } from '@/hooks/useTypewriterReveal';
import { formatTranscriptTime } from '@/lib/play/transcript';
import { cn } from '@/lib/utils';

type GmNarrationBubbleProps = {
  entryId: string;
  content: string;
  timestamp: number;
  streaming?: boolean;
  /** Typewrite full content that arrived without prior deltas. */
  reveal?: boolean;
  ooc?: boolean;
  onRevealComplete?: (entryId: string) => void;
};

/** GM story bubble with typewriter reveal + optional TTS control. */
export function GmNarrationBubble({
  entryId,
  content,
  timestamp,
  streaming = false,
  reveal = false,
  ooc = false,
  onRevealComplete,
}: GmNarrationBubbleProps) {
  const { text, revealing } = useTypewriterReveal(content, {
    enabled: true,
    streaming,
    reveal,
  });
  const revealCompleted = useRef(false);

  useEffect(() => {
    if (!reveal || !onRevealComplete || revealCompleted.current) return;
    if (!revealing) {
      revealCompleted.current = true;
      onRevealComplete(entryId);
    }
  }, [reveal, revealing, entryId, onRevealComplete]);

  return (
    <article
      className={cn(
        'play-bubble play-bubble-gm',
        ooc && 'opacity-90',
        (streaming || revealing) && 'play-bubble-streaming',
      )}
      aria-busy={streaming || revealing || undefined}
      // Muted while filling; settled text is announced once from StoryStack.
      aria-live={streaming || revealing ? 'off' : undefined}
    >
      <header className="play-bubble-head">
        <span className="play-avat play-avat-gm" aria-hidden>
          G
        </span>
        <span className="play-bubble-speaker">Game Master</span>
        {!streaming && !revealing ? (
          <NarrationSpeechButton entryId={entryId} text={content} />
        ) : null}
        <time
          className="play-bubble-ts"
          dateTime={new Date(timestamp).toISOString()}
        >
          {formatTranscriptTime(timestamp)}
        </time>
      </header>
      <NarrationBody
        content={text}
        streaming={streaming || revealing}
        highlightQuotes
      />
    </article>
  );
}
