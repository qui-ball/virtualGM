import { cn } from '@/lib/utils';

export type NavLink = {
  label: string;
  href?: string;
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
          'rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] min-w-[44px] inline-flex items-center justify-center touch-manipulation';
        if (link.href !== undefined) {
          return (
            <a
              key={link.label}
              href={link.href}
              className={shared}
              onClick={onLinkClick}
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
