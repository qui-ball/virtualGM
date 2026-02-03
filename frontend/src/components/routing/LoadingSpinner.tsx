import { ContentArea } from '@/components/layout';
import { Loader2 } from 'lucide-react';

/**
 * Loading spinner component for route transitions
 *
 * Displays a centered loading spinner while lazy-loaded routes are loading.
 */
export function LoadingSpinner({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <ContentArea maxWidth="container" padding="md" className={className}>
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </ContentArea>
  );
}
