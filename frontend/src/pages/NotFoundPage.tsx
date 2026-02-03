import { Link } from 'react-router-dom';
import { ContentArea } from '@/components/layout';
import { Home, SearchX } from 'lucide-react';
import { ROUTES } from '@/routes/constants';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * 404 Not Found page component
 *
 * Displays when a user navigates to a route that doesn't exist.
 */
export function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <ContentArea maxWidth="container" padding="md">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center">
            <SearchX
              className="h-16 w-16 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            404 - Page Not Found
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to={ROUTES.HOME}
            className={cn(
              'inline-flex items-center justify-center gap-2',
              'px-6 py-3 rounded-md',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors',
              'min-h-[44px]', // Touch-friendly
              'font-medium'
            )}
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>Go Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className={cn(
              'px-6 py-3 rounded-md',
              'bg-secondary text-secondary-foreground',
              'hover:bg-secondary/80',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors',
              'min-h-[44px]', // Touch-friendly
              'font-medium'
            )}
          >
            Go Back
          </button>
        </div>
      </div>
    </ContentArea>
  );
}
