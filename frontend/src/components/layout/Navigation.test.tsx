import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Navigation, type NavItem } from './Navigation';

const mockItems: NavItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'campaigns', label: 'Campaigns', href: '/campaigns' },
  { id: 'characters', label: 'Characters', href: '/characters', active: true },
];

describe('Navigation', () => {
  const renderWithRouter = (
    component: React.ReactElement,
    initialEntries: string[] = ['/']
  ) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
    );
  };

  it('renders navigation items', () => {
    renderWithRouter(<Navigation items={mockItems} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
  });

  it('shows mobile menu button on mobile', () => {
    renderWithRouter(<Navigation items={mockItems} />);
    const menuButton = screen.getByLabelText('Toggle navigation menu');
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveClass('md:hidden');
  });

  it('toggles mobile menu when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Navigation items={mockItems} />);

    const menuButton = screen.getByLabelText('Toggle navigation menu');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation')).toHaveTextContent('Home');

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onItemClick when item is clicked', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    renderWithRouter(
      <Navigation items={mockItems} onItemClick={onItemClick} />
    );

    // Open mobile menu first
    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);

    // Click a nav item (use getAllByText since both mobile and desktop render)
    const homeItems = screen.getAllByText('Home');
    await user.click(homeItems[0]); // Click the mobile menu item

    expect(onItemClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('calls item onClick handler when provided', async () => {
    const user = userEvent.setup();
    const itemOnClick = vi.fn();
    const itemsWithHandler: NavItem[] = [
      { ...mockItems[0], onClick: itemOnClick },
    ];

    renderWithRouter(<Navigation items={itemsWithHandler} />);

    // Open mobile menu
    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);

    // Click the item (use getAllByText since both mobile and desktop render)
    const homeItems = screen.getAllByText('Home');
    await user.click(homeItems[0]); // Click the mobile menu item

    expect(itemOnClick).toHaveBeenCalled();
  });

  it('marks active item with aria-current', () => {
    // Use /characters so the Characters NavLink is active (NavLink sets aria-current from route)
    renderWithRouter(<Navigation items={mockItems} />, ['/characters']);

    // Open mobile menu to see items
    const menuButton = screen.getByLabelText('Toggle navigation menu');
    fireEvent.click(menuButton);

    // NavLink sets aria-current="page" on the active link; find the Characters link
    const charactersLinks = screen.getAllByRole('link', {
      name: /characters/i,
    });
    const activeLink = charactersLinks.find(
      el => el.getAttribute('aria-current') === 'page'
    );
    expect(activeLink).toBeDefined();
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('closes mobile menu after item click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Navigation items={mockItems} />);

    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    // Click mobile menu item (first one in getAllByText)
    const homeItems = screen.getAllByText('Home');
    await user.click(homeItems[0]);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('has proper ARIA labels', () => {
    renderWithRouter(
      <Navigation items={mockItems} mobileMenuLabel="Custom nav" />
    );
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Custom nav');
  });

  it('has touch-friendly button sizes (min 44x44px)', () => {
    renderWithRouter(<Navigation items={mockItems} />);
    const menuButton = screen.getByLabelText('Toggle navigation menu');
    expect(menuButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');
  });

  it('shows desktop navigation on larger screens', () => {
    renderWithRouter(<Navigation items={mockItems} />);
    const desktopNav = screen
      .getByRole('navigation')
      .querySelector('.hidden.md\\:flex');
    expect(desktopNav).toBeInTheDocument();
  });

  it('closes mobile menu on Escape key press', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Navigation items={mockItems} />);

    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('returns focus to menu button after Escape key', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Navigation items={mockItems} />);

    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);
    await user.keyboard('{Escape}');

    expect(document.activeElement).toBe(menuButton);
  });

  it('closes mobile menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <div>
        <div data-testid="outside">Outside</div>
        <Navigation items={mockItems} />
      </div>
    );

    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByTestId('outside'));
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('focuses first menu item when mobile menu opens', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Navigation items={mockItems} />);

    const menuButton = screen.getByLabelText('Toggle navigation menu');
    await user.click(menuButton);

    // Wait for focus to move
    await new Promise(resolve => setTimeout(resolve, 10));

    const homeItems = screen.getAllByText('Home');
    const mobileItem = homeItems.find(
      item => item.closest('[id="mobile-menu"]') !== null
    );
    expect(document.activeElement).toBe(mobileItem);
  });

  it('renders nothing when items array is empty', () => {
    const { container } = renderWithRouter(<Navigation items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when items is undefined', () => {
    const { container } = renderWithRouter(
      <Navigation items={undefined as unknown as NavItem[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});
