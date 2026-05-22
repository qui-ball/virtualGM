import type { RollResultFields } from '@/lib/play/transcript';
import {
  rollBreakdownText,
  rollVerdictText,
  type RollD20Result,
} from '@/lib/play/roll';
import { cn } from '@/lib/utils';

type RollResultCardProps = {
  result: RollResultFields;
};

export function RollResultCard({ result }: RollResultCardProps) {
  const rollLike: RollD20Result = {
    dieA: result.dieA,
    dieB: result.dieB,
    nat: result.nat,
    total: result.total,
    modifier: result.modifier,
    advUsed: result.advUsed,
    crit: result.crit,
    fumble: result.fumble,
    pass: result.pass,
  };
  const verdict = rollVerdictText(rollLike);
  const verdictClass = result.crit
    ? 'crit'
    : result.fumble
      ? 'fail'
      : result.pass === true
        ? 'pass'
        : result.pass === false
          ? 'fail'
          : '';

  let breakdown = rollBreakdownText(rollLike, result.stat);
  if (result.vs != null) {
    breakdown += ` · vs ${result.vs}`;
  } else if (result.dc != null) {
    breakdown += ` · vs DC ${result.dc}`;
  }

  return (
    <div className="play-result-card-wrap">
      <div
        className={cn(
          'play-result-card',
          result.crit && 'play-result-card-crit',
          result.fumble && 'play-result-card-fumble',
        )}
      >
        <header className="flex items-center gap-1.5">
          <span className="play-dice-glyph" aria-hidden />
          <span className="play-roll-card-speaker">
            System · {result.label}
            {result.freeRoll ? ' · free' : ''} · result
          </span>
        </header>
        <div className="flex items-baseline gap-2.5">
          <span className="play-result-big">{result.total}</span>
          {result.crit ? (
            <span className="play-result-nat-pill">✦ NAT 20</span>
          ) : null}
          {result.fumble ? (
            <span
              className="play-result-nat-pill"
              style={{ background: 'var(--bad)' }}
            >
              ✗ NAT 1
            </span>
          ) : null}
        </div>
        <p className="play-mono text-[0.6875rem] leading-snug text-[var(--ink-2)]">
          {breakdown}
        </p>
        {verdict ? (
          <p className={cn('play-result-verdict', verdictClass && `play-result-verdict-${verdictClass}`)}>
            {result.crit ? '⚡ ' : result.fumble ? '✗ ' : result.pass === true ? '✓ ' : result.pass === false ? '✗ ' : ''}
            {verdict}
          </p>
        ) : null}
      </div>
    </div>
  );
}
