import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorPage } from '../ErrorPage';
import * as reactRouterDom from 'react-router-dom';

// Mock useRouteError and isRouteErrorResponse (plain objects may not pass real isRouteErrorResponse)
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof reactRouterDom>('react-router-dom');
  return {
    ...actual,
    useRouteError: vi.fn(),
    isRouteErrorResponse: (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: number }).status === 'number',
  };
});

describe('ErrorPage', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>
    );
  };

  it('renders default error message', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue(undefined);

    renderWithRouter();
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
  });

  it('renders error message from Error object', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue(
      new Error('Test error')
    );

    renderWithRouter();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders route error response', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue({
      status: 404,
      statusText: 'Not Found',
      data: { message: 'Page not found' },
    });

    renderWithRouter();
    expect(screen.getByText(/Error 404/i)).toBeInTheDocument();
  });

  it('renders home link', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue(undefined);

    renderWithRouter();
    const homeLink = screen.getByText('Go Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders reload button', () => {
    vi.mocked(reactRouterDom.useRouteError).mockReturnValue(undefined);

    renderWithRouter();
    const reloadButton = screen.getByText('Reload Page');
    expect(reloadButton).toBeInTheDocument();
    expect(reloadButton.tagName).toBe('BUTTON');
  });
});
