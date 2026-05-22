import type { CharacterView } from '@/lib/play/characterView';
import { VitalBar } from '@/components/play/VitalBar';
import { cn } from '@/lib/utils';

type CharHeaderProps = {
  character: CharacterView;
  height: number;
  dragging?: boolean;
  className?: string;
};

/** Phase 1 pull-sheet reveal: name, class, XP bar. */
export function CharHeader({
  character,
  height,
  dragging = false,
  className,
}: CharHeaderProps) {
  return (
    <div
      className={cn(
        'play-char-header shrink-0',
        dragging && 'play-char-header-dragging',
        className,
      )}
      style={{ height }}
      aria-hidden={height < 4}
    >
      <div className="play-char-header-inner">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="play-lbl">Character</p>
            <p className="play-h-display truncate text-lg">{character.name}</p>
            <p className="play-mono mt-0.5 text-[0.5625rem] tracking-widest text-[var(--ink-3)] uppercase">
              {character.classLabel} · Lv {character.level}
            </p>
          </div>
          {character.xpNext != null ? (
            <div className="shrink-0 text-right">
              <p className="play-lbl">XP → {character.level + 1}</p>
              <p className="play-mono text-[0.625rem] text-[var(--ink-2)]">
                {character.xp}/{character.xpNext}
              </p>
              <VitalBar
                value={character.xp}
                max={character.xpNext}
                kind="xp"
                className="mt-1 w-20"
                aria-label={`Experience ${character.xp} of ${character.xpNext}`}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
