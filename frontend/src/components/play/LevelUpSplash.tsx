import { createPortal } from 'react-dom';

type LevelUpSplashProps = {
  open: boolean;
  characterName: string;
  fromLevel: number;
  toLevel: number;
  onDismiss: () => void;
};

/** Fullscreen celebration before the level-up choice dialog (mirrors combat splash). */
export function LevelUpSplash({
  open,
  characterName,
  fromLevel,
  toLevel,
  onDismiss,
}: LevelUpSplashProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <button
      type="button"
      className="play-level-up-splash"
      aria-live="assertive"
      aria-label={`Level up! ${characterName} reaches level ${toLevel}`}
      onClick={onDismiss}
    >
      <p className="play-level-up-splash-title">LEVEL UP</p>
      <p className="play-level-up-splash-name">
        {characterName}
        <span className="play-level-up-splash-levels">
          {' '}
          · Lv {fromLevel} → {toLevel}
        </span>
      </p>
      <p className="play-level-up-splash-sub">tap to continue</p>
    </button>,
    document.body,
  );
}
