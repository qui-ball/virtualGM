import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';

describe('HomePage', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = 'Original Title';
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  };

  it('renders welcome message', () => {
    renderWithRouter();
    expect(screen.getByText(/Welcome to Virtual GM/i)).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderWithRouter();
    expect(
      screen.getByText(/Your digital companion for tabletop RPG adventures/i)
    ).toBeInTheDocument();
  });

  it('renders quick navigation cards', () => {
    renderWithRouter();
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders features section', () => {
    renderWithRouter();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Campaign Management')).toBeInTheDocument();
    expect(screen.getByText('Character Builder')).toBeInTheDocument();
  });

  it('has accessible navigation links', () => {
    renderWithRouter();
    const campaignsLink = screen.getByText('Campaigns').closest('a');
    expect(campaignsLink).toHaveAttribute('href', '/campaigns');
  });

  it('sets page title', () => {
    renderWithRouter();
    expect(document.title).toBe('Home - Virtual GM');
  });
});
