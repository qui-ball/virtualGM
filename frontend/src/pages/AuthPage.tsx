import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LocationState = { from?: string };

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50';

/**
 * Email/password sign-in and sign-up. Uses Supabase Auth; themed via `data-theme` + semantic tokens.
 */
export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const rawFrom = (location.state as LocationState | null)?.from;
  const from =
    typeof rawFrom === 'string' && rawFrom.length > 0 && rawFrom !== '/auth'
      ? rawFrom
      : '/';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) {
          setError(err.message);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
      }
      navigate(from, { replace: true });
    } finally {
      setPending(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'signin'
            ? 'Sign in to continue to Virtual GM.'
            : 'Sign up with email and password.'}
        </p>
      </div>

      <div
        className={cn(
          'rounded-lg border border-border bg-card/40 p-6 shadow-sm',
          'ring-1 ring-border/60'
        )}
      >
        <div
          className="mb-6 flex rounded-md border border-border bg-muted/30 p-0.5 text-sm"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={cn(
              'flex-1 rounded-sm px-3 py-2 font-medium transition-[color,background-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-default)]',
              mode === 'signin'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={cn(
              'flex-1 rounded-sm px-3 py-2 font-medium transition-[color,background-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-default)]',
              mode === 'signup'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
          >
            Sign up
          </button>
        </div>

        <form className="space-y-4" onSubmit={e => void handleSubmit(e)}>
          <div className="space-y-2">
            <label htmlFor="auth-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputClass}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'auth-error' : undefined}
            />
          </div>

          {error ? (
            <p
              id="auth-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <Link
          to="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
