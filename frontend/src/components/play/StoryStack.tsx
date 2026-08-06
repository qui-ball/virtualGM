import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  nextFollowState,
  tailScrollTop,
} from '@/lib/play/transcriptScroll';
import type { TranscriptEntry } from '@/lib/play/transcript';
import { formatTranscriptTime } from '@/lib/play/transcript';
import { hasActiveNarrationPresentation } from '@/lib/play/narrationStream';
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
  onNarrationRevealComplete?: (entryId: string) => void;
  className?: string;
};

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
  onNarrationRevealComplete,
  className,
}: StoryStackProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const followTailRef = useRef(true);
  const lastScrollTopRef = useRef(0);

  const visible = entries.filter(
    (e) => !(e.kind === 'message' && e.content === '__loading__'),
  );

  // Once narration is flowing — or a GM bubble just settled and may still be
  // typewriting — the text itself is the progress indicator.
  const presenting = hasActiveNarrationPresentation(entries);
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
      if (
        e.kind === 'message' &&
        e.role === 'gm' &&
        !e.streaming &&
        !e.reveal
      ) {
        return e.content;
      }
    }
    return '';
  }, [visible]);

  const scrollToTail = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !followTailRef.current) return;
    const target = tailScrollTop(scroller);
    if (target - scroller.scrollTop < 1) return;
    // Jumps rather than animates: streaming delivers a new tail ~28 times a second and a
    // smooth scroll restarted that often never finishes, so it reads as jitter.
    scroller.scrollTop = target;
    lastScrollTopRef.current = target;
  }, []);

  // Only a deliberate scroll up stops the follow — growing content never does, or a long
  // narration would out-run the threshold mid-reveal and strand the reader.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => {
      followTailRef.current = nextFollowState({
        following: followTailRef.current,
        metrics: scroller,
        lastScrollTop: lastScrollTopRef.current,
      });
      lastScrollTopRef.current = scroller.scrollTop;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  // Narration typewrites for seconds after `entries` last changed, and the visible area
  // shrinks when the sheet or the mobile keyboard opens — both push the tail out of view
  // without a render, so it is chased from the DOM rather than from React state.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const chase = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scrollToTail();
      });
    };

    const grown =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(chase);
    grown?.observe(scroller, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const resized =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(chase);
    resized?.observe(scroller);

    return () => {
      grown?.disconnect();
      resized?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollToTail]);

  // Mount (resumed transcripts open at the newest line) and every transcript change.
  useEffect(() => {
    scrollToTail();
  }, [entries, loading, presenting, scrollToTail]);

  return (
    <div
      ref={scrollerRef}
      className={cn('play-story-stack min-h-0 flex-1', className)}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-busy={loading || rolling}
    >
      {visible.map((entry) => {
        switch (entry.kind) {
          case 'summary':
            return (
              <details
                key={entry.id}
                className="play-summary-block my-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)]/60 px-3 py-2"
              >
                <summary className="cursor-pointer text-sm font-medium text-[var(--ink-2)]">
                  Earlier events
                  {entry.segmentIndex > 0
                    ? ` · part ${entry.segmentIndex}`
                    : ''}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-3)]">
                  {entry.text}
                </p>
              </details>
            );

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
                  reveal={Boolean(entry.reveal)}
                  ooc={entry.ooc}
                  onRevealComplete={onNarrationRevealComplete}
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

      {loading && !presenting && !lastIsGm ? (
        <p
          className="play-thinking px-1 text-sm text-[var(--ink-3)]"
          role="status"
        >
          GM is thinking…
        </p>
      ) : null}

      <div className="h-px shrink-0" aria-hidden />
    </div>
  );
}
