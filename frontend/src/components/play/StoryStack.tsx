import { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '@/lib/play/transcript';
import { formatTranscriptTime } from '@/lib/play/transcript';
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, loading]);

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
            return (
              <article
                key={entry.id}
                className={cn(
                  'play-bubble',
                  isGm ? 'play-bubble-gm' : 'play-bubble-you',
                  entry.ooc && 'opacity-90',
                )}
              >
                <header className="play-bubble-head">
                  <span
                    className={cn(
                      'play-avat',
                      isGm ? 'play-avat-gm' : 'play-avat-you',
                    )}
                    aria-hidden
                  >
                    {isGm ? 'G' : monogram(characterName)}
                  </span>
                  <span className="play-bubble-speaker">
                    {isGm ? 'Game Master' : `You · ${characterName}`}
                  </span>
                  <time
                    className="play-bubble-ts"
                    dateTime={new Date(entry.timestamp).toISOString()}
                  >
                    {formatTranscriptTime(entry.timestamp)}
                  </time>
                </header>
                <p className="play-bubble-body whitespace-pre-wrap">
                  {entry.content}
                </p>
              </article>
            );
          }
        }
      })}

      {loading ? (
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
