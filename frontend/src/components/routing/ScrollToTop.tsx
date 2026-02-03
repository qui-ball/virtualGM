import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component
 *
 * Scrolls the window to the top when the route changes.
 * This ensures users start at the top of the page when navigating.
 *
 * @example
 * ```tsx
 * <AppLayout>
 *   <ScrollToTop />
 *   <Outlet />
 * </AppLayout>
 * ```
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth', // Smooth scroll for better UX
    });
  }, [pathname]);

  return null;
}
