import { Link } from 'react-router-dom';

/**
 * 404 placeholder. Shown for unknown routes.
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 text-center">
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="text-muted-foreground">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Go to home
      </Link>
    </div>
  );
}
