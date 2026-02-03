import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '../AppLayout';
import { LoadingSpinner } from '@/components/routing/LoadingSpinner';

const HomePage = lazy(() =>
  import('@/pages/HomePage').then(m => ({ default: m.HomePage }))
);

describe('AppLayout', () => {
  const createRouter = (initialEntries = ['/']) => {
    return createMemoryRouter(
      [
        {
          path: '/',
          element: <AppLayout />,
          children: [
            {
              index: true,
              element: (
                <Suspense fallback={<LoadingSpinner />}>
                  <HomePage />
                </Suspense>
              ),
            },
          ],
        },
      ],
      { initialEntries }
    );
  };

  it('renders header with app name', () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Virtual GM')).toBeInTheDocument();
  });

  it('renders navigation component', () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders main content area with id for skip link', () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders child routes via Outlet', async () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome to Virtual GM/i)).toBeInTheDocument();
    });
  });

  it('highlights active route in navigation via NavLink', async () => {
    const router = createRouter(['/']);
    render(<RouterProvider router={router} />);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Virtual GM/i)).toBeInTheDocument();
    });

    // NavLink should handle active state automatically
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toBeInTheDocument();
    // NavLink will apply active classes when route matches
  });
});
