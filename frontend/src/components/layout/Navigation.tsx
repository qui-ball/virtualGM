import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type NavLink = {
  label: string;
  /** Client-side route path (use with React Router). Rendered as <Link>. */
  to?: string;
  /** External or full URL. Rendered as <a>. */
  href?: string;
  /** Button-style link with callback (no navigation). */
  onClick?: () => void;
};

type NavigationProps = {
  links: NavLink[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onLinkClick?: () => void;
};

/**
 * Navigation list of links. Use in Header (desktop) or inside Sheet (mobile).
 * orientation: horizontal for header bar, vertical for drawer.
 * onLinkClick: optional callback (e.g. close mobile sheet when a link is clicked).
 */
export function Navigation({
  links,
  orientation = 'horizontal',
  className,
  onLinkClick,
}: NavigationProps) {
  const isVertical = orientation === 'vertical';

  return (
    <nav
      className={cn(
        'flex gap-1',
        isVertical ? 'flex-col gap-0' : 'flex-row items-center gap-2',
        className
      )}
      aria-label="Main navigation"
    >
      {links.map(link => {
        const shared =
          'rounded-md px-3 py-2 text-sm font-medium text-foreground transition-[color,background-color] duration-[var(--duration-base)] ease-[var(--ease-default)] hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] min-w-[44px] inline-flex items-center justify-center touch-manipulation';
        const activeClass = 'bg-accent text-accent-foreground';
        if (link.to !== undefined) {
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(shared, isActive && activeClass)
              }
              onClick={onLinkClick}
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          );
        }
        if (link.href !== undefined) {
          return (
            <a
              key={link.href}
              href={link.href}
              className={shared}
              onClick={onLinkClick}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              {link.label}
            </a>
          );
        }
        return (
          <button
            key={link.label}
            type="button"
            className={cn(shared, 'bg-transparent border-0 cursor-pointer')}
            onClick={() => {
              link.onClick?.();
              onLinkClick?.();
            }}
          >
            {link.label}
          </button>
        );
      })}
    </nav>
  );
}
