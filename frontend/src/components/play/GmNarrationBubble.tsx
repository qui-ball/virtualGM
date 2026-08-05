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
  ooc?: boolean;
};

/** GM story bubble with typewriter reveal + optional TTS control. */
export function GmNarrationBubble({
  entryId,
  content,
  timestamp,
  streaming = false,
  ooc = false,
}: GmNarrationBubbleProps) {
  const { text, revealing } = useTypewriterReveal(content, {
    enabled: true,
    streaming,
  });

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
