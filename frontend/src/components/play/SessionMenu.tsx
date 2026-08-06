import { useNavigate } from 'react-router-dom';
import { isDev } from '@/config';
import { useSoftAccount } from '@/auth';
import { PLAY_ROUTES } from '@/lib/play/routes';
import { PlayGlyph } from '@/components/play/PlayGlyph';
import { PlayIcon } from '@/components/play/PlayIcon';
import { cn } from '@/lib/utils';

type SessionMenuProps = {
  open: boolean;
  onClose: () => void;
  debugConsoleOpen?: boolean;
  onDebugConsoleToggle?: () => void;
  className?: string;
};

export function SessionMenu({
  open,
  onClose,
  debugConsoleOpen = false,
  onDebugConsoleToggle,
  className,
}: SessionMenuProps) {
  const navigate = useNavigate();
  const { clearAccount } = useSoftAccount();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="play-menu-backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className={cn('play-session-menu', className)}
        role="dialog"
        aria-label="Session menu"
      >
        <button
          type="button"
          className="play-menu-item min-h-[44px]"
          onClick={() => {
            onClose();
            navigate(PLAY_ROUTES.campaign);
          }}
        >
          <span className="play-menu-glyph" aria-hidden>
            <PlayIcon name="home" />
          </span>
          Campaigns
        </button>
        <button
          type="button"
          className="play-menu-item min-h-[44px]"
          disabled
          title="Coming soon"
        >
          <span className="play-menu-glyph" aria-hidden>
            <PlayIcon name="scroll" />
          </span>
          Settings
        </button>
        <button
          type="button"
          className="play-menu-item min-h-[44px]"
          onClick={() => {
            onClose();
            clearAccount();
            navigate('/auth', { replace: true });
          }}
        >
          <PlayGlyph name="signout" className="play-menu-glyph" />
          Log out
        </button>
        {isDev && onDebugConsoleToggle ? (
          <div className="play-session-menu-dev">
            <button
              type="button"
              className={cn(
                'play-menu-item play-menu-item-dev-toggle min-h-[44px] w-full',
                debugConsoleOpen && 'play-menu-item-on',
              )}
              onClick={() => {
                onDebugConsoleToggle();
                onClose();
              }}
            >
              <PlayGlyph name="debug" className="play-menu-glyph" />
              Debug console
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
