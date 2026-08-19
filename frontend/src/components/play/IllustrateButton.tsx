import { PlayIcon } from '@/components/play/PlayIcon';
import { illustrateNarration } from '@/lib/play/narrationIllustrate';
import { cn } from '@/lib/utils';

type IllustrateButtonProps = {
  entryId: string;
  text: string;
  className?: string;
};

/**
 * Optional scene illustration control under a settled GM narration.
 * Hooks the future image API via {@link illustrateNarration}.
 */
export function IllustrateButton({
  entryId,
  text,
  className,
}: IllustrateButtonProps) {
  const disabled = !text.trim();

  return (
    <button
      type="button"
      className={cn('play-illustrate-btn', className)}
      aria-label="Illustrate this scene"
      title="Illustrate this scene"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        void illustrateNarration({ entryId, text });
      }}
    >
      <PlayIcon name="painting" className="size-3" />
      Illustrate
    </button>
  );
}
