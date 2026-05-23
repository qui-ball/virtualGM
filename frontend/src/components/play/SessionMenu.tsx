import { useNavigate } from 'react-router-dom';
import { enableAuth, isDev } from '@/config';
import { useAuth } from '@/auth';
import { PLAY_ROUTES } from '@/lib/play/routes';
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
  const { signOut } = useAuth();

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
            <PlayIcon name="swap" />
          </span>
          Switch character
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
        {enableAuth ? (
          <button
            type="button"
            className="play-menu-item min-h-[44px]"
            onClick={() => {
              onClose();
              void signOut();
            }}
          >
            <span className="play-menu-glyph" aria-hidden>
              ↩
            </span>
            Sign out
          </button>
        ) : null}
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
              <span className="play-menu-glyph" aria-hidden>
                ◈
              </span>
              Debug console
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
