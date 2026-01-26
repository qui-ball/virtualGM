import React from 'react';
import { cn } from '@/lib/utils';

export interface ContentAreaProps {
  /**
   * Main content to display
   */
  children: React.ReactNode;
  /**
   * Maximum width constraint
   * - 'full': No max width
   * - 'container': Uses container max-width
   * - 'narrow': Narrower max-width for reading
   */
  maxWidth?: 'full' | 'container' | 'narrow';
  /**
   * Padding size
   * - 'none': No padding
   * - 'sm': Small padding (mobile)
   * - 'md': Medium padding (default)
   * - 'lg': Large padding (desktop)
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Whether content should scroll independently
   */
  scrollable?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ContentArea component for main application content
 * 
 * Features:
 * - Responsive padding and spacing
 * - Proper scroll handling
 * - Flexible max-width options
 * - Mobile-optimized
 * 
 * @example
 * ```tsx
 * <ContentArea maxWidth="container" padding="md">
 *   <YourContent />
 * </ContentArea>
 * ```
 */
export const ContentArea: React.FC<ContentAreaProps> = ({
  children,
  maxWidth = 'container',
  padding = 'md',
  scrollable = false,
  className,
}) => {
  const maxWidthClasses = {
    full: 'max-w-full',
    container: 'max-w-7xl mx-auto',
    narrow: 'max-w-3xl mx-auto',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4 sm:p-6',
    md: 'p-4 sm:p-6 md:p-8 lg:p-12',
    lg: 'p-6 sm:p-8 md:p-12 lg:p-16',
  };

  return (
    <main
      id="main-content"
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        scrollable && 'overflow-y-auto',
        className
      )}
      role="main"
    >
      {children}
    </main>
  );
};
