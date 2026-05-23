import type { RollPromptFields } from '@/lib/play/transcript';
import { rollButtonLabel } from '@/lib/play/roll';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { cn } from '@/lib/utils';
import { isDev } from '@/config';

type RollPromptCardProps = {
  prompt: RollPromptFields;
  timestamp: number;
  rolled?: boolean;
  advUsed?: import('@/lib/play/transcript').AdvType;
  rolling?: boolean;
  onRoll: () => void;
  showStubBanner?: boolean;
};

function advLabel(adv: import('@/lib/play/transcript').AdvType): string {
  if (adv === 'adv') return 'Advantage';
  if (adv === 'dis') return 'Disadvantage';
  return 'Normal roll';
}

function advGlyph(adv: import('@/lib/play/transcript').AdvType): string {
  if (adv === 'adv') return '↟';
  if (adv === 'dis') return '↡';
  return '•';
}

export function RollPromptCard({
  prompt,
  timestamp,
  rolled = false,
  advUsed,
  rolling = false,
  onRoll,
  showStubBanner = isDev,
}: RollPromptCardProps) {
  const ts = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (rolled) {
    const used = advUsed ?? prompt.advType;
    return (
      <div className="play-roll-card opacity-55" aria-hidden>
        <header className="play-roll-card-head">
          <span className="play-dice-glyph" aria-hidden />
          <span className="play-roll-card-speaker">
            System · {prompt.label} — rolled
          </span>
          <time className="play-bubble-ts">{ts}</time>
        </header>
        <p className="play-mono text-[0.6875rem] text-[var(--ink-3)]">
          rolled {advLabel(used)} → see result below
        </p>
      </div>
    );
  }

  const titleId = `roll-prompt-${prompt.id}-title`;

  return (
    <section
      className="play-roll-card"
      role="region"
      aria-labelledby={titleId}
      aria-describedby={`roll-prompt-${prompt.id}-formula`}
    >
      {showStubBanner && prompt.stubEnriched ? (
        <p className="play-roll-stub-banner" role="note">
          Dev: roll fields inferred from purpose text
        </p>
      ) : null}
      <header className="play-roll-card-head">
        <span className="play-dice-glyph" aria-hidden />
        <span className="play-roll-card-speaker">System · GM asks for a roll</span>
        <time className="play-bubble-ts" dateTime={new Date(timestamp).toISOString()}>
          {ts}
        </time>
      </header>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={titleId} className="play-h-display text-lg">
          {prompt.label}
        </h3>
        {prompt.vsLabel || prompt.dc != null ? (
          <Pill variant="tint">{prompt.vsLabel ?? `DC ${prompt.dc}`}</Pill>
        ) : null}
      </div>
      <p
        id={`roll-prompt-${prompt.id}-formula`}
        className="play-mono text-[0.6875rem] leading-snug text-[var(--ink-3)]"
      >
        d20 {prompt.modifier >= 0 ? '+' : ''}
        {prompt.modifier}
        {prompt.stat ? ` ${prompt.stat}` : ''}
        {prompt.source ? ` · ${prompt.source}` : ''}
      </p>
      <div
        id={`roll-prompt-${prompt.id}-adv`}
        className={cn('play-adv-indicator', prompt.advType)}
        role="status"
        aria-label={advLabel(prompt.advType)}
      >
        <span className="play-adv-glyph" aria-hidden>
          {advGlyph(prompt.advType)}
        </span>
        <span className="play-adv-text">{advLabel(prompt.advType)}</span>
        {prompt.advReason ? (
          <span className="play-adv-reason">— {prompt.advReason}</span>
        ) : null}
      </div>
      <button
        type="button"
        className="play-btn-primary flex w-full min-h-[44px] items-center justify-center gap-2"
        onClick={onRoll}
        disabled={rolling}
        aria-busy={rolling}
        aria-describedby={
          prompt.advReason
            ? `roll-prompt-${prompt.id}-adv`
            : undefined
        }
      >
        <PlayIcon name="bolt" className="size-4" />
        {rolling ? 'Rolling…' : rollButtonLabel(prompt.advType, prompt.modifier, prompt.stat)}
      </button>
      {prompt.footer ? (
        <p className="play-roll-card-footer">{prompt.footer}</p>
      ) : null}
    </section>
  );
}
