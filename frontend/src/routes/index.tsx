import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/routing/LoadingSpinner';
import { ErrorPage } from '@/pages/ErrorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/**
 * Lazy-loaded page components for code splitting
 *
 * Each page is loaded only when needed, reducing initial bundle size.
 */
const HomePage = lazy(() =>
  import('@/pages/HomePage').then(m => ({ default: m.HomePage }))
);
const CampaignsPage = lazy(() =>
  import('@/pages/CampaignsPage').then(m => ({ default: m.CampaignsPage }))
);
const CharactersPage = lazy(() =>
  import('@/pages/CharactersPage').then(m => ({ default: m.CharactersPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
);

// Test pages - only loaded in development
const LayoutTestPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/pages/LayoutTestPage').then(m => ({
        default: m.LayoutTestPage,
      }))
    )
  : null;
const ResponsiveTestPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/pages/ResponsiveTestPage').then(m => ({
        default: m.ResponsiveTestPage,
      }))
    )
  : null;

/**
 * Route configuration for the application
 *
 * This file defines all routes in the application using React Router v6.
 * Routes are organized hierarchically with nested layouts.
 *
 * Features:
 * - Code splitting with lazy loading
 * - Test routes only in development
 * - 404 catch-all route
 * - Error boundary
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'campaigns',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <CampaignsPage />
          </Suspense>
        ),
      },
      {
        path: 'characters',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <CharactersPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      // Test/development pages - only in development mode
      ...(import.meta.env.DEV && LayoutTestPage && ResponsiveTestPage
        ? [
            {
              path: 'test/layout',
              element: (
                <Suspense fallback={<LoadingSpinner />}>
                  <LayoutTestPage />
                </Suspense>
              ),
            },
            {
              path: 'test/responsive',
              element: (
                <Suspense fallback={<LoadingSpinner />}>
                  <ResponsiveTestPage />
                </Suspense>
              ),
            },
          ]
        : []),
      // 404 catch-all route - must be last
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

/**
 * Create the router instance
 */
export const router = createBrowserRouter(routes);

// Re-export for consumers that import from '@/routes'
export { ROUTES, type RoutePath } from './constants';
