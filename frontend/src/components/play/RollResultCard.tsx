import type { RollResultFields } from '@/lib/play/transcript';
import {
  isSkillCheckResult,
  rollBreakdownForResult,
  rollVerdictForResult,
} from '@/lib/play/rollFormula';
import { cn } from '@/lib/utils';

type RollResultCardProps = {
  result: RollResultFields;
};

export function RollResultCard({ result }: RollResultCardProps) {
  const verdict = rollVerdictForResult(result);
  const skillCheck = isSkillCheckResult(result);
  const showCombatCrit = result.crit && !skillCheck;
  const showCombatFumble = result.fumble && !skillCheck;
  const verdictClass = showCombatCrit
    ? 'crit'
    : showCombatFumble
      ? 'fail'
      : result.pass === true
        ? 'pass'
        : result.pass === false
          ? 'fail'
          : '';

  const breakdown = rollBreakdownForResult(result);

  const summary = `${result.label}: ${result.total}${verdict ? `, ${verdict}` : ''}`;
  const showNatPills = result.diceType === 'd20' || result.diceType == null;

  return (
    <div
      className="play-result-card-wrap"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={summary}
    >
      <div
        className={cn(
          'play-result-card',
          showCombatCrit && 'play-result-card-crit',
          showCombatFumble && 'play-result-card-fumble',
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
          {showNatPills && result.nat === 20 ? (
            <span className="play-result-nat-pill">✦ NAT 20</span>
          ) : null}
          {showNatPills && result.nat === 1 ? (
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
            {showCombatCrit ? '⚡ ' : showCombatFumble ? '✗ ' : result.pass === true ? '✓ ' : result.pass === false ? '✗ ' : ''}
            {verdict}
          </p>
        ) : null}
      </div>
    </div>
  );
}
