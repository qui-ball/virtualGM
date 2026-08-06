import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Navigation, type NavLink } from './Navigation';
import { useIsTabletOrUp } from '@/hooks';
import { useAuth, useSoftAccount } from '@/auth';
import { enableAuth } from '@/config';
import { isPlayPath } from '@/lib/play/routes';
import { ThemeSelect } from '@/theme';

type HeaderProps = {
  /** App name or logo label */
  title?: string;
  /** Navigation links (used in desktop bar and mobile drawer) */
  navLinks?: NavLink[];
};

/**
 * App header with branding and responsive navigation.
 * - Desktop (768px+): logo + horizontal nav.
 * - Mobile: logo + menu button that opens a Sheet drawer with vertical nav.
 */
export function Header({ title = 'Virtual GM', navLinks = [] }: HeaderProps) {
  const isTabletOrUp = useIsTabletOrUp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { account, clearAccount } = useSoftAccount();
  const { pathname } = useLocation();

  // The lobby, the session menu and the gate each carry their own account control,
  // so the global one would only sit a few pixels above a duplicate.
  const showAccountControls =
    !isPlayPath(pathname) && !pathname.startsWith('/auth');

  function logOut() {
    clearAccount();
    navigate('/auth', { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 flex min-h-[56px] items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-h-[44px] min-w-[44px] items-center">
        <span className="text-lg font-semibold text-foreground">{title}</span>
      </div>

      <div className="flex min-h-[44px] flex-1 items-center justify-end gap-2 md:gap-3">
        <ThemeSelect compact className="shrink-0" />

        {showAccountControls && account ? (
          <span
            className="hidden max-w-[120px] truncate text-xs text-muted-foreground md:inline"
            title={account.displayName}
          >
            {account.displayName}
          </span>
        ) : null}
        {showAccountControls ? (
          account ? (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={logOut}
            >
              Log out
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link to="/auth">Choose account</Link>
            </Button>
          )
        ) : null}

        {enableAuth && !authLoading && user ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        ) : null}

        {isTabletOrUp ? (
          <Navigation
            links={navLinks}
            orientation="horizontal"
            className="shrink-0"
          />
        ) : (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="min-h-[44px] min-w-[44px] shrink-0"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <Navigation
                  links={navLinks}
                  orientation="vertical"
                  onLinkClick={() => setSheetOpen(false)}
                />
              </div>
              {account ? (
                <p className="mt-4 truncate border-t border-border pt-4 text-xs text-muted-foreground">
                  Playing as {account.displayName}
                </p>
              ) : null}
              {!authLoading && user ? (
                <p
                  className="mt-2 truncate text-xs text-muted-foreground"
                  title={user.email ?? ''}
                >
                  {user.email}
                </p>
              ) : null}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}
