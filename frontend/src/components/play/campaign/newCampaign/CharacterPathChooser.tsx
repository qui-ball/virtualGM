import type { CharacterPath } from '@/lib/play/newCampaignFlow';
import { cn } from '@/lib/utils';

type CharacterPathChooserProps = {
  selected: CharacterPath | null;
  onSelect: (path: CharacterPath) => void;
};

export function CharacterPathChooser({
  selected,
  onSelect,
}: CharacterPathChooserProps) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-2"
      role="listbox"
      aria-label="Character path"
    >
      <button
        type="button"
        role="option"
        aria-selected={selected === 'prebuilt'}
        className={cn(
          'play-select-card play-h-display w-full max-w-sm min-h-[56px] text-center text-lg tracking-wide',
          selected === 'prebuilt' && 'play-select-card-on',
        )}
        onClick={() => onSelect('prebuilt')}
      >
        Pick a pre-built character
      </button>

      <button
        type="button"
        role="option"
        aria-selected={selected === 'create'}
        className={cn(
          'play-select-card play-h-display w-full max-w-sm min-h-[56px] text-center text-lg tracking-wide',
          selected === 'create' && 'play-select-card-on',
        )}
        onClick={() => onSelect('create')}
      >
        Create new
      </button>
    </div>
  );
}
