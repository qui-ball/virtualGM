/**
 * Route path constants for type-safe navigation.
 *
 * Kept in a separate file to avoid circular dependencies when pages
 * or components need ROUTES without loading the full route config.
 */

const BASE_ROUTES = {
  HOME: '/',
  CAMPAIGNS: '/campaigns',
  CHARACTERS: '/characters',
  SETTINGS: '/settings',
} as const;

const DEV_ROUTES = import.meta.env.DEV
  ? {
      TEST_LAYOUT: '/test/layout',
      TEST_RESPONSIVE: '/test/responsive',
    }
  : {};

export const ROUTES = {
  ...BASE_ROUTES,
  ...DEV_ROUTES,
} as const;

export type RoutePath = Exclude<
  (typeof ROUTES)[keyof typeof ROUTES],
  undefined
>;
