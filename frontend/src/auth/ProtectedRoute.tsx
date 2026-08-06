import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { useSoftAccount } from '@/auth/SoftAccountProvider';
import { enableAuth } from '@/config';

type ProtectedRouteProps = {
  children: ReactNode;
};

/**
 * Requires a soft account (Feature 07). When `VITE_ENABLE_AUTH=true`, also
 * requires a Supabase session.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { account, isReady } = useSoftAccount();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!account) {
    return (
      <Navigate to="/auth" replace state={{ from: location.pathname }} />
    );
  }

  if (enableAuth) {
    if (isLoading) {
      return (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Loading session…
        </div>
      );
    }
    if (!user) {
      return (
        <Navigate to="/auth" replace state={{ from: location.pathname }} />
      );
    }
  }

  return <>{children}</>;
}
