import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isPlayPath } from '@/lib/play/routes';
import { useIsTabletOrUp } from '@/hooks';
import { Header } from './Header';
import type { NavLink } from './Navigation';
import { ContentArea } from './ContentArea';

type AppLayoutProps = {
  title?: string;
  navLinks: NavLink[];
};

/**
 * Root layout: global header hidden on play routes below tablet width.
 * Tablet/desktop (768px+) always shows header above play pages.
 */
export function AppLayout({ title = 'Virtual GM', navLinks }: AppLayoutProps) {
  const { pathname } = useLocation();
  const isTabletOrUp = useIsTabletOrUp();
  const onPlayRoute = isPlayPath(pathname);
  const showHeader = !onPlayRoute || isTabletOrUp;

  return (
    <div className="flex h-svh max-h-svh flex-col overflow-hidden">
      {showHeader ? <Header title={title} navLinks={navLinks} /> : null}
      <ContentArea
        className={cn(
          onPlayRoute &&
            'overflow-hidden p-0 md:p-0 lg:p-0',
        )}
      >
        <div
          className={cn(
            'min-h-0',
            onPlayRoute ? 'flex h-full min-h-0 flex-1 flex-col' : 'contents',
          )}
        >
          <Outlet />
        </div>
      </ContentArea>
    </div>
  );
}
