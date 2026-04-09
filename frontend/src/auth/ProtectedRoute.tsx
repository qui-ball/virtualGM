import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

type ProtectedRouteProps = {
  children: ReactNode;
};

/** Sends anonymous users to `/auth`, preserving `location.state.from` for post-login redirect. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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
