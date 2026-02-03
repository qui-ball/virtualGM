import { ContentArea } from '@/components/layout';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Settings page component
 *
 * This page provides application settings and preferences.
 * Currently a placeholder - will be implemented in future phases.
 */
export function SettingsPage() {
  usePageTitle('Settings');
  return (
    <ContentArea maxWidth="container" padding="md">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your application preferences
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-card border rounded-lg p-8 sm:p-12">
          <div className="max-w-2xl space-y-6">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Application Settings</h2>
              <p className="text-sm text-muted-foreground">
                Settings and preferences will be available in a future update.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Account</h2>
              <p className="text-sm text-muted-foreground">
                Account management features coming soon.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Notification preferences will be configurable here.
              </p>
            </section>
          </div>
        </div>
      </div>
    </ContentArea>
  );
}
