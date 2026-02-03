import React from 'react';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  /**
   * App name or logo text to display
   */
  appName?: string;
  /**
   * Optional logo component or image
   */
  logo?: React.ReactNode;
  /**
   * Additional content to display in the header (e.g., user menu, actions)
   */
  children?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Header component for the application
 *
 * Features:
 * - Responsive design (mobile-first)
 * - App branding/logo area
 * - Mobile-optimized layout
 * - Accessible navigation
 *
 * @example
 * ```tsx
 * <Header appName="Virtual GM" />
 * ```
 */
export const Header: React.FC<HeaderProps> = ({
  appName = 'Virtual GM',
  logo,
  children,
  className,
}) => {
  // Validate appName is not empty
  const displayName = appName?.trim() || 'Virtual GM';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'px-4 sm:px-6 lg:px-8',
        'h-14 sm:h-16',
        'flex items-center justify-between',
        className
      )}
      role="banner"
    >
      {/* Skip to main content link (accessibility) */}
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only',
          'focus:absolute focus:top-2 focus:left-2 focus:z-[100]',
          'focus:px-4 focus:py-2',
          'focus:bg-primary focus:text-primary-foreground',
          'focus:rounded-md focus:ring-2 focus:ring-ring'
        )}
      >
        Skip to main content
      </a>
      <div className="flex items-center gap-2 sm:gap-4">
        {logo && (
          <div className="flex-shrink-0" aria-hidden="true">
            {logo}
          </div>
        )}
        <h1
          className={cn(
            'text-lg sm:text-xl lg:text-2xl font-bold',
            'text-foreground',
            'truncate'
          )}
        >
          {displayName}
        </h1>
      </div>

      {children && (
        <div className="flex items-center gap-2 sm:gap-4">{children}</div>
      )}
    </header>
  );
};
