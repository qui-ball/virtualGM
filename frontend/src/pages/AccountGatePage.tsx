import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createAccount, listAccounts } from '@/api/client';
import { useSoftAccount } from '@/auth/SoftAccountProvider';
import { PlayShell } from '@/components/play';
import type { SoftAccountSummary } from '@/types';

type LocationState = { from?: string };

/**
 * Soft-account gate — pick Qui/Bilun (or add a name). No passwords.
 * Styled with the play/tavern surface to match Campaigns lobby.
 */
export function AccountGatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, selectAccount } = useSoftAccount();
  const rawFrom = (location.state as LocationState | null)?.from;
  const from =
    typeof rawFrom === 'string' && rawFrom.length > 0 && rawFrom !== '/auth'
      ? rawFrom
      : '/campaign';

  const [accounts, setAccounts] = useState<SoftAccountSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (account) {
      navigate(from, { replace: true });
    }
  }, [account, navigate, from]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAccounts();
        if (cancelled) return;
        setAccounts(res.accounts);
        if (res.accounts.length > 0) {
          setSelectedId(res.accounts[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load accounts',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function continueWith(id: string, displayName: string) {
    selectAccount({ id, displayName });
    navigate(from, { replace: true });
  }

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const row = accounts.find((a) => a.id === selectedId);
    if (!row) {
      setError('Select an account');
      return;
    }
    continueWith(row.id, row.display_name);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) {
      setError('Enter a display name');
      return;
    }
    setPending(true);
    try {
      const created = await createAccount(name);
      const next = {
        id: created.id,
        display_name: created.display_name,
        created_at: created.created_at,
      };
      setAccounts((prev) =>
        [...prev.filter((a) => a.id !== next.id), next].sort((a, b) =>
          a.display_name.localeCompare(b.display_name),
        ),
      );
      setSelectedId(created.id);
      setNewName('');
      setAdding(false);
      continueWith(created.id, created.display_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <PlayShell>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--ink-3)]">
          Loading accounts…
        </div>
      </PlayShell>
    );
  }

  return (
    <PlayShell>
      <header className="play-appbar shrink-0">
        <div className="min-w-0 flex-1">
          <p className="play-lbl text-[var(--accent)]">Virtual GM</p>
          <h1 className="play-appbar-title">Who is playing?</h1>
          <p className="play-appbar-sub">
            Progress stays separate per name — no password.
          </p>
        </div>
      </header>

      <div className="play-lobby-scroll min-h-0 flex-1 px-4 py-4">
        {error ? (
          <p
            className="play-panel mb-3 space-y-1 p-3 text-sm text-[var(--bad)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {!adding ? (
          <form
            className="play-panel play-panel-glow space-y-4 p-4"
            onSubmit={handleContinue}
          >
            <label className="block space-y-1.5">
              <span className="play-lbl">Account</span>
              <select
                className="w-full min-h-[44px] rounded-[var(--radius-sm)] border border-[var(--panel-edge)] bg-[var(--panel)] px-3 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_var(--accent),var(--glow)]"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={accounts.length === 0}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="play-btn-primary w-full min-h-[44px]"
              disabled={!selectedId}
            >
              Continue
            </button>
            <button
              type="button"
              className="play-btn-ghost w-full min-h-[44px]"
              onClick={() => setAdding(true)}
            >
              Add account
            </button>
          </form>
        ) : (
          <form
            className="play-panel play-panel-glow space-y-4 p-4"
            onSubmit={(e) => void handleAdd(e)}
          >
            <label className="block space-y-1.5">
              <span className="play-lbl">Display name</span>
              <input
                className="w-full min-h-[44px] rounded-[var(--radius-sm)] border border-[var(--panel-edge)] bg-[var(--panel)] px-3 text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_var(--accent),var(--glow)]"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Alex"
                autoFocus
                maxLength={100}
              />
            </label>
            <button
              type="submit"
              className="play-btn-primary w-full min-h-[44px]"
              disabled={pending}
            >
              {pending ? 'Creating…' : 'Create & continue'}
            </button>
            <button
              type="button"
              className="play-btn-ghost w-full min-h-[44px]"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              disabled={pending}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </PlayShell>
  );
}
