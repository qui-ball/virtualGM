/**
 * Layout Test Page
 * 
 * This page tests the layout components (Header, Navigation, ContentArea)
 * at different breakpoints to verify mobile-first responsive design.
 * 
 * Use browser DevTools to test different viewport sizes:
 * - Mobile: < 640px (sm breakpoint)
 * - Tablet: 640px - 767px (sm to md)
 * - Tablet Landscape: 768px - 1023px (md to lg)
 * - Desktop: 1024px+ (lg+)
 */

import { Header, Navigation, ContentArea } from '@/components/layout';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'home', label: 'Home', href: '/', active: true },
  { id: 'campaigns', label: 'Campaigns', href: '/campaigns' },
  { id: 'characters', label: 'Characters', href: '/characters' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

export function LayoutTestPage() {

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with Navigation */}
      <Header appName="Virtual GM">
        <Navigation 
          items={navItems}
          onItemClick={(item) => console.log('Clicked:', item)}
        />
      </Header>

      {/* Content Area */}
      <ContentArea maxWidth="container" padding="md">
        <div className="space-y-8">
          {/* Viewport Info */}
          <section className="bg-card border rounded-lg p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Current Viewport</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              <ViewportBadge name="Mobile" min="0px" max="639px" />
              <ViewportBadge name="Tablet (sm)" min="640px" max="767px" />
              <ViewportBadge name="Tablet (md)" min="768px" max="1023px" />
              <ViewportBadge name="Desktop (lg+)" min="1024px" max="∞" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Resize your browser window or use DevTools device toolbar to test different breakpoints.
            </p>
          </section>

          {/* Touch Target Test */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Touch Target Size Test</h2>
            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                All interactive elements should be at least 44x44px for mobile accessibility.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <TouchTargetTest label="Button" size="small" />
                <TouchTargetTest label="Nav Item" size="medium" />
                <TouchTargetTest label="Card" size="large" />
                <TouchTargetTest label="Icon" size="icon" />
              </div>
            </div>
          </section>

          {/* Layout Component Tests */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Layout Component Tests</h2>
            
            {/* Header Test */}
            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Header Component</h3>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <strong>Mobile:</strong> Compact height (h-14), smaller padding
                  </div>
                  <div>
                    <strong>Desktop:</strong> Taller (h-16), more padding
                  </div>
                </div>
                <div className="text-muted-foreground">
                  ✓ Sticky positioning works<br />
                  ✓ Responsive padding (px-4 → sm:px-6 → lg:px-8)<br />
                  ✓ Responsive height (h-14 → sm:h-16)
                </div>
              </div>
            </div>

            {/* Navigation Test */}
            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Navigation Component</h3>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <strong>Mobile (&lt; 768px):</strong> Hamburger menu → drawer
                  </div>
                  <div>
                    <strong>Desktop (≥ 768px):</strong> Horizontal navigation
                  </div>
                </div>
                <div className="text-muted-foreground">
                  ✓ Drawer menu on mobile<br />
                  ✓ Horizontal nav on desktop<br />
                  ✓ Touch targets ≥ 44x44px<br />
                  ✓ Keyboard navigation (Escape key)<br />
                  ✓ Click-outside to close
                </div>
              </div>
            </div>

            {/* ContentArea Test */}
            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold mb-4">ContentArea Component</h3>
              <div className="space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <strong>Mobile:</strong> Full width, small padding (p-4)
                  </div>
                  <div>
                    <strong>Desktop:</strong> Max-width container, large padding (lg:p-12)
                  </div>
                </div>
                <div className="text-muted-foreground">
                  ✓ Responsive padding (p-4 → sm:p-6 → md:p-8 → lg:p-12)<br />
                  ✓ Max-width container (max-w-7xl)<br />
                  ✓ Centered on desktop (mx-auto)
                </div>
              </div>
            </div>
          </section>

          {/* Responsive Grid Test */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Responsive Grid Test</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div
                  key={num}
                  className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center min-h-[100px] flex items-center justify-center"
                >
                  <div>
                    <div className="text-2xl font-bold text-primary">Item {num}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Responsive grid
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop) → 4 columns (xl)
            </p>
          </section>

          {/* Typography Scaling Test */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Typography Scaling</h2>
            <div className="bg-card border rounded-lg p-4 sm:p-6 md:p-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Responsive Heading
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4">
                This paragraph scales with screen size for optimal readability.
              </p>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Smaller text also scales appropriately.
              </p>
            </div>
          </section>

          {/* Spacing Test */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Spacing Test</h2>
            <div className="bg-card border rounded-lg p-4 sm:p-6 md:p-8 lg:p-12">
              <p className="mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                Padding increases with screen size:
              </p>
              <ul className="space-y-2 sm:space-y-3 md:space-y-4 list-disc list-inside text-sm sm:text-base">
                <li>Mobile: 1rem (16px) padding</li>
                <li>Tablet (sm): 1.5rem (24px) padding</li>
                <li>Tablet Landscape (md): 2rem (32px) padding</li>
                <li>Desktop (lg): 3rem (48px) padding</li>
              </ul>
            </div>
          </section>
        </div>
      </ContentArea>
    </div>
  );
}

function ViewportBadge({ 
  name, 
  min, 
  max
}: { 
  name: string; 
  min: string; 
  max: string;
}) {
  return (
    <div className="bg-muted border rounded p-2 text-center">
      <div className="font-semibold text-sm">{name}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {min} - {max}
      </div>
    </div>
  );
}

function TouchTargetTest({ 
  label, 
  size 
}: { 
  label: string; 
  size: 'small' | 'medium' | 'large' | 'icon';
}) {
  const sizeClasses = {
    small: 'min-w-[44px] min-h-[44px] px-2 py-2',
    medium: 'min-w-[44px] min-h-[44px] px-4 py-2',
    large: 'min-w-[44px] min-h-[44px] px-6 py-3',
    icon: 'min-w-[44px] min-h-[44px] p-2',
  };

  return (
    <button
      className={cn(
        'bg-primary text-primary-foreground rounded-md',
        'hover:bg-primary/90 transition-colors',
        'flex items-center justify-center',
        sizeClasses[size]
      )}
      aria-label={`${label} touch target test`}
    >
      <span className="text-xs sm:text-sm">{label}</span>
      <span className="text-xs ml-1 opacity-75">44px</span>
    </button>
  );
}

