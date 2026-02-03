import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '../NotFoundPage';

describe('NotFoundPage', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
  };

  it('renders 404 message', () => {
    renderWithRouter();
    expect(screen.getByText(/404 - Page Not Found/i)).toBeInTheDocument();
  });

  it('renders helpful error message', () => {
    renderWithRouter();
    expect(
      screen.getByText(/The page you're looking for doesn't exist/i)
    ).toBeInTheDocument();
  });

  it('renders home link', () => {
    renderWithRouter();
    const homeLink = screen.getByText('Go Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders go back button', () => {
    renderWithRouter();
    const backButton = screen.getByText('Go Back');
    expect(backButton).toBeInTheDocument();
    expect(backButton.tagName).toBe('BUTTON');
  });
});
