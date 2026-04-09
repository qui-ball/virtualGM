import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useAuth } from '@/auth';

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
  const { user, isLoading: authLoading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex min-h-[56px] items-center justify-between gap-3 border-b border-border bg-background px-4 md:px-6">
      <div className="flex min-h-[44px] min-w-[44px] items-center">
        <span className="text-lg font-semibold text-foreground">{title}</span>
      </div>

      <div className="flex min-h-[44px] flex-1 items-center justify-end gap-2 md:gap-3">
        {!authLoading && user ? (
          <span
            className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:inline"
            title={user.email ?? ''}
          >
            {user.email}
          </span>
        ) : null}
        {!authLoading && user ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        ) : !authLoading ? (
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to="/auth">Sign in</Link>
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
              {!authLoading && user ? (
                <p
                  className="mt-4 truncate border-t border-border pt-4 text-xs text-muted-foreground"
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
