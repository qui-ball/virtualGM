/**
 * Responsive Breakpoint Tests
 *
 * Tests layout components at different viewport sizes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header, Navigation, ContentArea } from '../index';
import type { NavItem } from '../Navigation';

// Mock window.matchMedia for viewport testing
const createMatchMedia = (matches: boolean) => {
  return (query: string) => ({
    matches: query.includes('(min-width:') ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
};

describe('Responsive Breakpoints', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Header Component', () => {
    it('applies mobile-first padding classes', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');

      // Mobile-first: base classes should be mobile
      expect(header).toHaveClass('px-4'); // Mobile padding
      expect(header).toHaveClass('sm:px-6'); // Tablet padding
      expect(header).toHaveClass('lg:px-8'); // Desktop padding
    });

    it('applies mobile-first height classes', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');

      expect(header).toHaveClass('h-14'); // Mobile height
      expect(header).toHaveClass('sm:h-16'); // Tablet+ height
    });

    it('applies mobile-first typography classes', () => {
      const { container } = render(<Header appName="Test" />);
      const h1 = container.querySelector('h1');

      expect(h1).toHaveClass('text-lg'); // Mobile
      expect(h1).toHaveClass('sm:text-xl'); // Tablet
      expect(h1).toHaveClass('lg:text-2xl'); // Desktop
    });
  });

  describe('Navigation Component', () => {
    const mockItems: NavItem[] = [
      { id: '1', label: 'Home' },
      { id: '2', label: 'About' },
    ];

    it('shows mobile menu button on mobile viewport', () => {
      window.matchMedia = createMatchMedia(
        false
      ) as unknown as typeof window.matchMedia;
      render(<Navigation items={mockItems} />);

      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toHaveClass('md:hidden'); // Hidden on desktop
    });

    it('has touch-friendly button sizes (44x44px minimum)', () => {
      render(<Navigation items={mockItems} />);

      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toHaveClass('min-w-[44px]');
      expect(menuButton).toHaveClass('min-h-[44px]');
    });

    it('navigation items have minimum 44x44px touch targets', async () => {
      const { container } = render(<Navigation items={mockItems} />);

      // Open mobile menu
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      menuButton.click();

      // Wait for menu to render
      await new Promise(resolve => setTimeout(resolve, 10));

      const mobileMenu = container.querySelector('[id="mobile-menu"]');
      expect(mobileMenu).toBeInTheDocument();

      const mobileButtons = mobileMenu?.querySelectorAll('button');
      expect(mobileButtons?.length).toBeGreaterThan(0);

      mobileButtons?.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });
  });

  describe('ContentArea Component', () => {
    it('applies mobile-first padding classes', () => {
      render(<ContentArea>Content</ContentArea>);
      const contentArea = screen.getByTestId('content-area');

      // Mobile-first: starts with mobile padding
      expect(contentArea).toHaveClass('p-4'); // Mobile
      expect(contentArea).toHaveClass('sm:p-6'); // Tablet
      expect(contentArea).toHaveClass('md:p-8'); // Tablet landscape
      expect(contentArea).toHaveClass('lg:p-12'); // Desktop
    });

    it('applies container max-width correctly', () => {
      render(<ContentArea maxWidth="container">Content</ContentArea>);
      const contentArea = screen.getByTestId('content-area');

      expect(contentArea).toHaveClass('max-w-7xl');
      expect(contentArea).toHaveClass('mx-auto');
    });

    it('applies full width when maxWidth is full', () => {
      render(<ContentArea maxWidth="full">Content</ContentArea>);
      const contentArea = screen.getByTestId('content-area');

      expect(contentArea).toHaveClass('max-w-full');
      expect(contentArea).not.toHaveClass('mx-auto');
    });
  });

  describe('Touch Target Sizes', () => {
    it('all navigation buttons meet 44x44px minimum', () => {
      const items: NavItem[] = [
        { id: '1', label: 'Item 1' },
        { id: '2', label: 'Item 2' },
      ];

      render(<Navigation items={items} />);

      // Check mobile menu button
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      expect(menuButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');

      // Check desktop nav items
      const desktopNav = screen
        .getByRole('navigation')
        .querySelector('.hidden.md\\:flex');
      const desktopButtons = desktopNav?.querySelectorAll('button');
      desktopButtons?.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]');
      });
    });
  });
});
