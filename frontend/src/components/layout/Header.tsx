import { useState } from 'react';
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

  return (
    <header className="sticky top-0 z-40 flex min-h-[56px] items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex min-h-[44px] min-w-[44px] items-center">
        <span className="text-lg font-semibold text-foreground">{title}</span>
      </div>

      {isTabletOrUp ? (
        <Navigation
          links={navLinks}
          orientation="horizontal"
          className="ml-auto"
        />
      ) : (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="min-h-[44px] min-w-[44px]"
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
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
