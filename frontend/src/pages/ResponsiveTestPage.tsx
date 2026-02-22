import { useBreakpoint } from '@/hooks';
import { Button } from '@/components/ui/button';

/**
 * Responsive design test page. Verifies breakpoints and Tailwind responsive utilities.
 * Resize the browser or use dev tools device emulation to see layout and label change.
 */
export function ResponsiveTestPage() {
  const breakpoint = useBreakpoint();

  return (
    <div className="w-full">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">
            Responsive design test
          </h1>
          <p className="text-muted-foreground">
            Resize the window or use browser dev tools (device toolbar) to test breakpoints.
          </p>
          <div
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
            data-testid="current-breakpoint"
          >
            <span className="font-medium">Current breakpoint:</span>
            <span className="capitalize text-foreground">{breakpoint}</span>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Breakpoint mapping
          </h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Mobile:</strong> &lt; 768px (default, no prefix)
            </li>
            <li>
              <strong className="text-foreground">Tablet:</strong> 768px+ (use <code className="rounded bg-muted px-1">md:</code>)
            </li>
            <li>
              <strong className="text-foreground">Desktop:</strong> 1024px+ (use <code className="rounded bg-muted px-1">lg:</code>)
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Responsive grid (1 → 2 → 3 columns)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {['Mobile only', 'Tablet and up', 'Desktop'].map((label, i) => (
              <div
                key={label}
                className="flex min-h-[120px] flex-col justify-between rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm"
              >
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Card {i + 1} — layout changes at md (768px) and lg (1024px).
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Touch targets
          </h2>
          <p className="text-sm text-muted-foreground">
            Minimum touch target: <strong className="text-foreground">44×44px</strong> (--touch-target-min). Layout nav and header menu use 44px. shadcn Button default is h-9 (36px); use <code className="rounded bg-muted px-1">{'size="lg"'}</code> (40px) for primary actions on mobile when needed.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="default">Default (h-9)</Button>
            <Button size="lg">Large (h-10)</Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Viewport testing checklist
          </h2>
          <p className="text-sm text-muted-foreground">
            Manually verify at each range (resize or use dev tools device toolbar):
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Mobile (&lt; 768px):</strong> Single-column layout, no horizontal scroll, header shows menu icon, nav in drawer, touch targets ≥ 44px for nav.
            </li>
            <li>
              <strong className="text-foreground">Tablet (768px–1024px):</strong> 2-column grid where used, horizontal nav in header, content padding md.
            </li>
            <li>
              <strong className="text-foreground">Desktop (&gt; 1024px):</strong> 3-column grid where used, full horizontal nav, content padding lg.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
