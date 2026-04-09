import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/auth/auth-context';

/** Access auth session and actions from any component under `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
