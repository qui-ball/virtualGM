import { describe, it, expect } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { routes, ROUTES } from '../index';

describe('Routes Configuration', () => {
  it('defines all expected routes', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.CAMPAIGNS).toBe('/campaigns');
    expect(ROUTES.CHARACTERS).toBe('/characters');
    expect(ROUTES.SETTINGS).toBe('/settings');
  });

  it('has routes array with correct structure', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('renders HomePage at root route', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/'],
    });

    render(<RouterProvider router={router} />);

    // Wait for lazy-loaded component
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Virtual GM/i)).toBeInTheDocument();
    });
  });

  it('renders CampaignsPage at /campaigns', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/campaigns'],
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Campaigns/i)).toBeInTheDocument();
    });
  });

  it('renders CharactersPage at /characters', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/characters'],
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Characters/i)).toBeInTheDocument();
    });
  });

  it('renders SettingsPage at /settings', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/settings'],
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });
  });

  it('renders NotFoundPage for unknown routes', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/unknown-route'],
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/404 - Page Not Found/i)).toBeInTheDocument();
    });
  });
});
