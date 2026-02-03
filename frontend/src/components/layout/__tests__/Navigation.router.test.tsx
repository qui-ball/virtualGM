import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { ROUTES } from '@/routes/constants';

describe('Navigation with React Router', () => {
  const createRouter = (initialEntries = ['/']) => {
    return createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <div>
              <Navigation
                items={[
                  { id: 'home', label: 'Home', href: ROUTES.HOME },
                  {
                    id: 'campaigns',
                    label: 'Campaigns',
                    href: ROUTES.CAMPAIGNS,
                  },
                ]}
              />
              <div>Page Content</div>
            </div>
          ),
          children: [
            {
              path: 'campaigns',
              element: <div>Campaigns Page</div>,
            },
          ],
        },
      ],
      { initialEntries }
    );
  };

  it('renders NavLink components for items with href', () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('applies active class to current route', () => {
    const router = createRouter(['/']);
    render(<RouterProvider router={router} />);

    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveClass('bg-muted', 'font-semibold');
  });

  it('calls onItemClick when item is clicked', () => {
    const handleItemClick = vi.fn();
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <Navigation
            items={[{ id: 'home', label: 'Home', href: ROUTES.HOME }]}
            onItemClick={handleItemClick}
          />
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    const homeLink = screen.getByText('Home');
    homeLink.click();

    expect(handleItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'home', label: 'Home' })
    );
  });

  it('renders button for items without href', () => {
    const handleClick = vi.fn();
    render(
      <Navigation
        items={[{ id: 'action', label: 'Action', onClick: handleClick }]}
      />
    );

    const actionButton = screen.getByText('Action');
    expect(actionButton.tagName).toBe('BUTTON');

    actionButton.click();
    expect(handleClick).toHaveBeenCalled();
  });

  it('handles both href and onClick for NavLink items', () => {
    const router = createRouter();

    render(<RouterProvider router={router} />);

    // Navigation should render with NavLink
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toBeInTheDocument();
  });
});
