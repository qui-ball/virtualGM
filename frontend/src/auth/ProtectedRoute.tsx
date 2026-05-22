import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { enableAuth } from '@/config';

type ProtectedRouteProps = {
  children: ReactNode;
};

/** Sends anonymous users to `/auth` when `VITE_ENABLE_AUTH=true`; otherwise renders children. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (!enableAuth) {
    return <>{children}</>;
  }

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

  return <>{children}</>;
}
