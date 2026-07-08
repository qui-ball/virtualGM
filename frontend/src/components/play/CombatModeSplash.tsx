import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { CombatSplashPhase } from '@/hooks/useCombatMode';

type CombatModeSplashProps = {
  phase: CombatSplashPhase;
  onDismiss: () => void;
};

export function CombatModeSplash({ phase, onDismiss }: CombatModeSplashProps) {
  if (phase === 'idle' || typeof document === 'undefined') return null;

  const isEnter = phase === 'enter';

  return createPortal(
    <button
      type="button"
      className={cn(
        'play-combat-splash',
        isEnter ? 'play-combat-splash-enter' : 'play-combat-splash-exit',
      )}
      aria-live="assertive"
      aria-label={isEnter ? 'Combat begins' : 'Combat ended'}
      onClick={onDismiss}
    >
      <p
        className={cn(
          'play-combat-splash-title',
          !isEnter && 'play-combat-splash-title-exit',
        )}
      >
        {isEnter ? '⚔ COMBAT' : 'COMBAT ENDED'}
      </p>
      <p className="play-combat-splash-sub">tap to continue</p>
    </button>,
    document.body,
  );
}
