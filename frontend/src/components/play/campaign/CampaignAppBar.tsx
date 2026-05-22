import type { CharacterView } from '@/lib/play/characterView';
import { PlayIcon } from '@/components/play/PlayIcon';
import { cn } from '@/lib/utils';

type CampaignAppBarProps = {
  character: CharacterView;
  onSwitchCharacter: () => void;
  className?: string;
};

export function CampaignAppBar({
  character,
  onSwitchCharacter,
  className,
}: CampaignAppBarProps) {
  return (
    <header
      className={cn('play-appbar shrink-0', className)}
      aria-label="Campaign lobby"
    >
      <div className="min-w-0 flex-1">
        <p className="play-lbl text-[var(--accent)]">Welcome back</p>
        <h1 className="play-appbar-title truncate">{character.name}</h1>
        <p className="play-appbar-sub">
          {character.classLabel} · Level {character.level}
        </p>
      </div>
      <button
        type="button"
        className="play-iconbtn min-h-[44px] min-w-[44px]"
        aria-label="Switch character"
        onClick={onSwitchCharacter}
      >
        <PlayIcon name="swap" />
      </button>
    </header>
  );
}
