import { useEffect, useMemo, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/a11y/motion';
import type { TranscriptEntry } from '@/lib/play/transcript';
import { formatTranscriptTime } from '@/lib/play/transcript';
import { hasStreamingNarration } from '@/lib/play/narrationStream';
import { GmNarrationBubble } from '@/components/play/GmNarrationBubble';
import { NarrationBody } from '@/components/play/NarrationBody';
import { RollPromptCard } from '@/components/play/RollPromptCard';
import { RollResultCard } from '@/components/play/RollResultCard';
import { SceneMarker } from '@/components/play/SceneMarker';
import { cn } from '@/lib/utils';

type StoryStackProps = {
  entries: TranscriptEntry[];
  characterName?: string;
  loading?: boolean;
  rolling?: boolean;
  showStubBanner?: boolean;
  onRollPrompt?: (promptId: string) => void;
  className?: string;
};

/** How far from the bottom the reader can be before auto-follow stops chasing the tail. */
const FOLLOW_THRESHOLD_PX = 120;

function monogram(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'Y';
}

export function StoryStack({
  entries,
  characterName = 'You',
  loading = false,
  rolling = false,
  showStubBanner = false,
  onRollPrompt,
  className,
}: StoryStackProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const visible = entries.filter(
    (e) => !(e.kind === 'message' && e.content === '__loading__'),
  );

  // Once narration is flowing — or a GM bubble just settled and may still be
  // typewriting — the text itself is the progress indicator.
  const streaming = hasStreamingNarration(entries);
  const lastVisible = visible[visible.length - 1];
  const lastIsGm =
    lastVisible?.kind === 'message' && lastVisible.role === 'gm';

  // The log region announces additions, so a streaming bubble would announce only its first
  // fragment ("The") and stay silent as the text grows in place — worse than before
  // streaming, when the whole narration was added at once. Streaming bubbles are therefore
  // muted below, and the finished text is announced once from here instead.
  const lastSettledNarration = useMemo(() => {
    for (let i = visible.length - 1; i >= 0; i--) {
      const e = visible[i];
      if (e.kind === 'message' && e.role === 'gm' && !e.streaming) {
        return e.content;
      }
    }
    return '';
  }, [visible]);

  useEffect(() => {
    const anchor = bottomRef.current;
    const scroller = anchor?.parentElement;
    // Streaming delivers a new entries array per token (~28/s). Following the tail is only
    // wanted while the reader is already at the tail — otherwise every token would yank a
    // reader who has scrolled up back to the bottom. And a smooth scroll restarted that
    // often never finishes, so it reads as jitter rather than motion.
    if (scroller) {
      const distanceFromBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      if (distanceFromBottom > FOLLOW_THRESHOLD_PX) return;
    }
    anchor?.scrollIntoView({
      behavior: prefersReducedMotion() || streaming ? 'auto' : 'smooth',
    });
  }, [entries, loading, streaming]);

  return (
    <div
      className={cn('play-story-stack min-h-0 flex-1', className)}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-busy={loading || rolling}
    >
      {visible.map((entry) => {
        switch (entry.kind) {
          case 'scene':
          case 'combat_start':
          case 'combat_end':
            return <SceneMarker key={entry.id} text={entry.text} />;

          case 'roll_prompt':
            return (
              <RollPromptCard
                key={entry.id}
                prompt={entry.prompt}
                timestamp={entry.timestamp}
                rolled={entry.rolled}
                advUsed={entry.advUsed}
                rolling={rolling}
                showStubBanner={showStubBanner}
                onRoll={() => onRollPrompt?.(entry.id)}
              />
            );

          case 'roll_result':
            return <RollResultCard key={entry.id} result={entry.result} />;

          case 'rest':
          case 'item':
            return (
              <article key={entry.id} className="play-bubble play-bubble-sys">
                <header className="play-bubble-head">
                  <span className="play-avat play-avat-sys" aria-hidden />
                  <span className="play-bubble-speaker">
                    System · {entry.kind}
                  </span>
                  <time
                    className="play-bubble-ts"
                    dateTime={new Date(entry.timestamp).toISOString()}
                  >
                    {formatTranscriptTime(entry.timestamp)}
                  </time>
                </header>
                <p className="play-bubble-body">{entry.text}</p>
              </article>
            );

          case 'message': {
            if (entry.error) {
              return (
                <article
                  key={entry.id}
                  className="play-bubble play-bubble-sys play-bubble-error"
                >
                  <header className="play-bubble-head">
                    <span className="play-avat play-avat-sys" aria-hidden />
                    <span className="play-bubble-speaker">System · Error</span>
                    <time
                      className="play-bubble-ts"
                      dateTime={new Date(entry.timestamp).toISOString()}
                    >
                      {formatTranscriptTime(entry.timestamp)}
                    </time>
                  </header>
                  <p className="play-bubble-body">{entry.content}</p>
                </article>
              );
            }

            if (entry.role === 'system') {
              return (
                <article key={entry.id} className="play-bubble play-bubble-sys">
                  <header className="play-bubble-head">
                    <span className="play-avat play-avat-sys" aria-hidden />
                    <span className="play-bubble-speaker">System</span>
                    <time
                      className="play-bubble-ts"
                      dateTime={new Date(entry.timestamp).toISOString()}
                    >
                      {formatTranscriptTime(entry.timestamp)}
                    </time>
                  </header>
                  <p className="play-bubble-body">{entry.content}</p>
                </article>
              );
            }

            const isGm = entry.role === 'gm';
            if (isGm) {
              return (
                <GmNarrationBubble
                  key={entry.id}
                  entryId={entry.id}
                  content={entry.content}
                  timestamp={entry.timestamp}
                  streaming={Boolean(entry.streaming)}
                  ooc={entry.ooc}
                />
              );
            }

            return (
              <article
                key={entry.id}
                className={cn(
                  'play-bubble play-bubble-you',
                  entry.ooc && 'opacity-90',
                )}
              >
                <header className="play-bubble-head">
                  <span className="play-avat play-avat-you" aria-hidden>
                    {monogram(characterName)}
                  </span>
                  <span className="play-bubble-speaker">
                    You · {characterName}
                  </span>
                  <time
                    className="play-bubble-ts"
                    dateTime={new Date(entry.timestamp).toISOString()}
                  >
                    {formatTranscriptTime(entry.timestamp)}
                  </time>
                </header>
                <NarrationBody
                  content={entry.content}
                  highlightQuotes={false}
                />
              </article>
            );
          }
        }
      })}

      <p className="sr-only" role="status" aria-live="polite">
        {lastSettledNarration}
      </p>

      {loading && !streaming && !lastIsGm ? (
        <p
          className="play-thinking px-1 text-sm text-[var(--ink-3)]"
          role="status"
        >
          GM is thinking…
        </p>
      ) : null}

      <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
    </div>
  );
}
