/**
 * Responsive Test Page
 *
 * This page demonstrates and tests responsive breakpoints.
 * Use this to verify that your responsive design works across different screen sizes.
 *
 * Breakpoints:
 * - Mobile: < 640px (default, no prefix)
 * - Tablet (sm): >= 640px
 * - Tablet Landscape (md): >= 768px
 * - Desktop (lg): >= 1024px
 * - Large Desktop (xl): >= 1280px
 * - XL Desktop (2xl): >= 1536px
 */

export function ResponsiveTestPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
            Responsive Design Test
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            Resize your browser or view on different devices to see breakpoints
            in action
          </p>
        </header>

        {/* Current Breakpoint Indicator */}
        <div className="bg-card border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Current Breakpoint</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <BreakpointBadge name="Mobile" prefix="" minWidth="0px" />
            <BreakpointBadge name="sm" prefix="sm:" minWidth="640px" />
            <BreakpointBadge name="md" prefix="md:" minWidth="768px" />
            <BreakpointBadge name="lg" prefix="lg:" minWidth="1024px" />
            <BreakpointBadge name="xl" prefix="xl:" minWidth="1280px" />
            <BreakpointBadge name="2xl" prefix="2xl:" minWidth="1536px" />
          </div>
        </div>

        {/* Grid Layout Test */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Grid Layout Test</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <div
                key={num}
                className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center"
              >
                <div className="text-2xl font-bold text-primary">
                  Item {num}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Responsive grid item
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography Test */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Typography Scaling</h2>
          <div className="bg-card border rounded-lg p-4 sm:p-6 md:p-8">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl">
              This text scales with screen size. On mobile it's smaller, on
              desktop it's larger.
            </p>
            <p className="text-xs sm:text-sm md:text-base mt-4 text-muted-foreground">
              Smaller text also scales appropriately for readability.
            </p>
          </div>
        </section>

        {/* Spacing Test */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Spacing Test</h2>
          <div className="bg-card border rounded-lg p-4 sm:p-6 md:p-8 lg:p-12">
            <p className="mb-2 sm:mb-4 md:mb-6">
              Padding increases with screen size:
            </p>
            <ul className="space-y-2 sm:space-y-3 md:space-y-4 list-disc list-inside">
              <li>Mobile: 1rem (16px) padding</li>
              <li>Tablet (sm): 1.5rem (24px) padding</li>
              <li>Tablet Landscape (md): 2rem (32px) padding</li>
              <li>Desktop (lg): 3rem (48px) padding</li>
            </ul>
          </div>
        </section>

        {/* Visibility Test */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Visibility Test</h2>
          <div className="space-y-2">
            <div className="block sm:hidden bg-destructive/20 border border-destructive rounded p-2 text-sm">
              🔴 Visible only on mobile (&lt; 640px)
            </div>
            <div className="hidden sm:block md:hidden bg-yellow-500/20 border border-yellow-500 rounded p-2 text-sm">
              🟡 Visible only on tablet (640px - 767px)
            </div>
            <div className="hidden md:block lg:hidden bg-blue-500/20 border border-blue-500 rounded p-2 text-sm">
              🔵 Visible only on tablet landscape (768px - 1023px)
            </div>
            <div className="hidden lg:block bg-green-500/20 border border-green-500 rounded p-2 text-sm">
              🟢 Visible on desktop and larger (≥ 1024px)
            </div>
          </div>
        </section>

        {/* Container Test */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Container Width Test</h2>
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <p className="text-sm sm:text-base">
              This container has a max-width that adapts:
            </p>
            <div className="mt-4 p-4 bg-muted rounded text-xs sm:text-sm font-mono">
              <div>Mobile: Full width</div>
              <div className="sm:block hidden">
                Tablet (sm): Max-width container
              </div>
              <div className="md:block hidden">
                Desktop (md+): Centered with max-width
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function BreakpointBadge({
  name,
  prefix,
  minWidth,
}: {
  name: string;
  prefix: string;
  minWidth: string;
}) {
  return (
    <div className="bg-muted border rounded p-2 text-center">
      <div className="font-semibold text-sm">{name}</div>
      <div className="text-xs text-muted-foreground mt-1">{prefix}</div>
      <div className="text-xs text-muted-foreground mt-1">≥ {minWidth}</div>
    </div>
  );
}
