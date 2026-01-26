import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  /**
   * Unique identifier for the nav item
   */
  id: string;
  /**
   * Display label for the nav item
   */
  label: string;
  /**
   * Optional href for navigation (if using routing)
   */
  href?: string;
  /**
   * Optional click handler
   */
  onClick?: () => void;
  /**
   * Whether this item is currently active
   */
  active?: boolean;
}

export interface NavigationProps {
  /**
   * Array of navigation items to display
   */
  items: NavItem[];
  /**
   * Optional mobile menu label (for accessibility)
   */
  mobileMenuLabel?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Callback when a nav item is clicked
   */
  onItemClick?: (item: NavItem) => void;
}

/**
 * Navigation component with mobile-friendly drawer menu
 * 
 * Features:
 * - Mobile-first responsive design
 * - Drawer menu on mobile (< 768px)
 * - Horizontal navigation on desktop
 * - Accessible with ARIA labels
 * - Touch-friendly (44x44px minimum touch targets)
 * 
 * @example
 * ```tsx
 * <Navigation
 *   items={[
 *     { id: 'home', label: 'Home', href: '/' },
 *     { id: 'campaigns', label: 'Campaigns', href: '/campaigns' },
 *   ]}
 * />
 * ```
 */
export const Navigation: React.FC<NavigationProps> = ({
  items,
  mobileMenuLabel = 'Main navigation',
  className,
  onItemClick,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Handle empty items array
  if (!items || items.length === 0) {
    return null;
  }

  const handleItemClick = (item: NavItem) => {
    setIsMobileMenuOpen(false);
    onItemClick?.(item);
    item.onClick?.();
  };

  // Handle Escape key and click-outside
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Focus management: move focus to first item when menu opens
  useEffect(() => {
    if (isMobileMenuOpen && firstItemRef.current) {
      // Small delay to ensure menu is rendered
      setTimeout(() => {
        firstItemRef.current?.focus();
      }, 0);
    }
  }, [isMobileMenuOpen]);

  return (
    <nav
      ref={navRef}
      className={cn('relative', className)}
      role="navigation"
      aria-label={mobileMenuLabel}
    >
      {/* Mobile Menu Button */}
      <button
        ref={menuButtonRef}
        className={cn(
          'md:hidden',
          'p-2 rounded-md',
          'text-foreground hover:bg-muted',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'min-w-[44px] min-h-[44px]', // Touch-friendly size
          'flex items-center justify-center'
        )}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-menu"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className={cn(
            'md:hidden',
            'absolute top-full left-0 right-0 mt-2',
            'bg-card border rounded-lg shadow-lg',
            'py-2',
            'z-50',
            'animate-in slide-in-from-top-2 fade-in-0 duration-200' // Smooth animation
          )}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={index === 0 ? firstItemRef : undefined}
              className={cn(
                'w-full text-left px-4 py-3',
                'text-sm sm:text-base',
                'min-h-[44px]', // Touch-friendly
                'hover:bg-muted',
                'focus:outline-none focus:bg-muted',
                'transition-colors',
                item.active && 'bg-muted font-semibold'
              )}
              onClick={() => handleItemClick(item)}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop Horizontal Navigation */}
      <div className="hidden md:flex items-center gap-1 lg:gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              'px-3 py-2 lg:px-4 lg:py-2',
              'text-sm lg:text-base',
              'rounded-md',
              'min-h-[44px]', // Touch-friendly
              'hover:bg-muted',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors',
              'whitespace-nowrap',
              item.active && 'bg-muted font-semibold'
            )}
            onClick={() => handleItemClick(item)}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
};
