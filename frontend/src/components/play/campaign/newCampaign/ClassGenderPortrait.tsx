import { cn } from '@/lib/utils';
import {
  classMonogram,
  portraitPlaceholderKey,
  type PortraitGender,
} from '@/lib/play/portraitPlaceholder';

type ClassGenderPortraitProps = {
  classId: string;
  gender: PortraitGender;
  className?: string;
};

/** Placeholder portrait frame until `{class}-{gender}` art ships. */
export function ClassGenderPortrait({
  classId,
  gender,
  className,
}: ClassGenderPortraitProps) {
  const key = portraitPlaceholderKey(classId, gender);
  return (
    <div
      className={cn(
        'flex w-16 shrink-0 flex-col items-center justify-center self-stretch rounded-[var(--radius-sm)] border border-[var(--panel-edge)] bg-[var(--panel)]',
        className,
      )}
      aria-label={`Portrait placeholder ${key}`}
      data-portrait-key={key}
    >
      <span className="play-h-display text-xl text-[var(--accent)]">
        {classMonogram(classId)}
      </span>
      <span className="play-mono mt-0.5 text-[0.5rem] uppercase text-[var(--ink-3)]">
        {gender}
      </span>
    </div>
  );
}
