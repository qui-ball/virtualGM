import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { NavItem } from './Navigation';
import { ScrollToTop } from '@/components/routing/ScrollToTop';
import { ROUTES } from '@/routes/constants';

/**
 * Main application layout component
 *
 * This component provides the consistent layout structure for all pages:
 * - Header with app branding
 * - Navigation menu
 * - Main content area (via Outlet)
 * - Scroll restoration on route changes
 *
 * The navigation automatically highlights the active route via NavLink.
 * No manual active state management needed.
 */
export function AppLayout() {
  // Define navigation items
  // NavLink automatically handles active state, so we don't need to pass it
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: ROUTES.HOME,
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      href: ROUTES.CAMPAIGNS,
    },
    {
      id: 'characters',
      label: 'Characters',
      href: ROUTES.CHARACTERS,
    },
    {
      id: 'settings',
      label: 'Settings',
      href: ROUTES.SETTINGS,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header appName="Virtual GM">
        <Navigation items={navItems} />
      </Header>
      <main id="main-content" className="flex-1">
        <ScrollToTop />
        <Outlet />
      </main>
    </div>
  );
}
