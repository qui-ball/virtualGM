import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AuthContextValue = {
  /** Current Supabase session, or null when signed out. */
  session: Session | null;
  /** Convenience alias for `session?.user ?? null`. */
  user: User | null;
  /** True until the initial `getSession()` completes — use to avoid auth flicker. */
  isLoading: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
