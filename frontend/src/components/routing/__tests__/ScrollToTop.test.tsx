import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ScrollToTop } from '../ScrollToTop';

// Mock window.scrollTo
const mockScrollTo = vi.fn();
window.scrollTo = mockScrollTo;

describe('ScrollToTop', () => {
  beforeEach(() => {
    mockScrollTo.mockClear();
  });

  it('scrolls to top when route changes', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <>
              <ScrollToTop />
              <div>Home</div>
            </>
          ),
        },
        {
          path: '/about',
          element: (
            <>
              <ScrollToTop />
              <div>About</div>
            </>
          ),
        },
      ],
      { initialEntries: ['/'] }
    );

    const { rerender } = render(<RouterProvider router={router} />);

    // Initial render should scroll
    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    // Navigate to different route
    router.navigate('/about');
    rerender(<RouterProvider router={router} />);

    // Should scroll again on route change
    expect(mockScrollTo).toHaveBeenCalledTimes(2);
  });

  it('renders nothing', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <ScrollToTop />,
      },
    ]);

    const { container } = render(<RouterProvider router={router} />);
    expect(container.firstChild).toBeNull();
  });
});
