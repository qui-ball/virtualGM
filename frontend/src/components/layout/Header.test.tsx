import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders with default app name', () => {
    render(<Header />);
    expect(screen.getByText('Virtual GM')).toBeInTheDocument();
  });

  it('renders with custom app name', () => {
    render(<Header appName="My App" />);
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('renders logo when provided', () => {
    const logo = <div data-testid="logo">Logo</div>;
    render(<Header logo={logo} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Header>
        <button>Action</button>
      </Header>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Header className="custom-class" />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('custom-class');
  });

  it('has proper ARIA role', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('is responsive with mobile-first classes', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    expect(header).toHaveClass('h-14', 'sm:h-16');
  });

  it('handles empty appName gracefully', () => {
    render(<Header appName="" />);
    expect(screen.getByText('Virtual GM')).toBeInTheDocument();
  });

  it('handles whitespace-only appName', () => {
    render(<Header appName="   " />);
    expect(screen.getByText('Virtual GM')).toBeInTheDocument();
  });

  it('renders skip to main content link', () => {
    render(<Header />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
