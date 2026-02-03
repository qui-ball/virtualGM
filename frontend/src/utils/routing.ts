import type { NavigateFunction, NavigateOptions } from 'react-router-dom';
import { ROUTES, type RoutePath } from '@/routes/constants';

/**
 * Routing utilities
 *
 * Helper functions for navigation and route management.
 */

/**
 * Check if a path matches a route
 *
 * @param path - The path to check
 * @param route - The route to match against
 * @returns True if the path matches the route
 */
export function isRoute(path: string, route: RoutePath | string): boolean {
  return path === route;
}

/**
 * Check if a path starts with a route (useful for nested routes)
 *
 * @param path - The path to check
 * @param route - The route to match against
 * @returns True if the path starts with the route
 */
export function isRoutePrefix(
  path: string,
  route: RoutePath | string
): boolean {
  return path.startsWith(route);
}

/**
 * Get route name from path
 *
 * @param path - The path to get the name for
 * @returns The route name or null if not found
 */
export function getRouteName(path: string): string | null {
  const routeEntry = Object.entries(ROUTES).find(
    ([, routePath]) => routePath === path
  );
  return routeEntry ? routeEntry[0] : null;
}

/**
 * Navigate to a route programmatically
 *
 * This is a convenience wrapper around React Router's navigate function.
 * For most use cases, prefer using `useNavigate()` hook directly.
 *
 * @param navigate - The navigate function from useNavigate hook
 * @param route - The route to navigate to
 * @param options - Optional navigation options (replace, state, etc.)
 *
 * @example
 * ```tsx
 * const navigate = useNavigate();
 * navigateToRoute(navigate, ROUTES.CAMPAIGNS, { replace: true });
 * ```
 */
export function navigateToRoute(
  navigate: NavigateFunction,
  route: RoutePath | string,
  options?: NavigateOptions
): void {
  navigate(route, options);
}
