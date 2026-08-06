import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearStoredAccount,
  readStoredAccount,
  writeStoredAccount,
  type SoftAccount,
} from '@/auth/accountStorage';
import { clearAllSessionCaches } from '@/lib/play/sessionCache';

type SoftAccountContextValue = {
  account: SoftAccount | null;
  isReady: boolean;
  selectAccount: (account: SoftAccount) => void;
  clearAccount: () => void;
};

const SoftAccountContext = createContext<SoftAccountContextValue | null>(null);

export function SoftAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<SoftAccount | null>(() =>
    readStoredAccount(),
  );

  const selectAccount = useCallback((next: SoftAccount) => {
    const prev = readStoredAccount();
    if (prev && prev.id !== next.id) {
      clearAllSessionCaches();
    }
    writeStoredAccount(next);
    setAccount(next);
  }, []);

  const clearAccount = useCallback(() => {
    clearStoredAccount();
    clearAllSessionCaches();
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({
      account,
      isReady: true,
      selectAccount,
      clearAccount,
    }),
    [account, selectAccount, clearAccount],
  );

  return (
    <SoftAccountContext.Provider value={value}>
      {children}
    </SoftAccountContext.Provider>
  );
}

export function useSoftAccount(): SoftAccountContextValue {
  const ctx = useContext(SoftAccountContext);
  if (!ctx) {
    throw new Error('useSoftAccount must be used within SoftAccountProvider');
  }
  return ctx;
}
