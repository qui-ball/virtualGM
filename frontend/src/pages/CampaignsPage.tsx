import { ContentArea } from '@/components/layout';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Campaigns page component
 *
 * This page displays and manages RPG campaigns.
 * Currently a placeholder - will be implemented in future phases.
 */
export function CampaignsPage() {
  usePageTitle('Campaigns');
  return (
    <ContentArea maxWidth="container" padding="md">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Manage your RPG campaigns and game sessions
            </p>
          </div>
          <button
            className={cn(
              'inline-flex items-center justify-center gap-2',
              'px-4 py-2 rounded-md',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'transition-colors',
              'min-h-[44px]', // Touch-friendly
              'text-sm sm:text-base'
            )}
            aria-label="Create new campaign"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Placeholder Content */}
        <div className="bg-card border rounded-lg p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-semibold">No campaigns yet</h2>
            <p className="text-muted-foreground">
              Get started by creating your first campaign. Campaign management
              features will be available in a future update.
            </p>
            <button
              className={cn(
                'mt-4',
                'px-6 py-3 rounded-md',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-colors',
                'min-h-[44px]', // Touch-friendly
                'font-medium'
              )}
            >
              Create Your First Campaign
            </button>
          </div>
        </div>
      </div>
    </ContentArea>
  );
}
