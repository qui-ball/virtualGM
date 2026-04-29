import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import viteLogo from '/vite.svg';
import { Button } from '@/components/ui/button';
import { RlsSupabaseSmokePanel } from '@/components/auth';
import { useAuth } from '@/auth';
import { apiBaseUrl, enableAuth, isDev } from '@/config';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Home page placeholder. Replace with dashboard or landing content.
 */
export function HomePage() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-center gap-4">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
          className="logo-link-spin"
        >
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <Card className="flex flex-col gap-4 p-8">
        <CardHeader className="space-y-2 p-0 text-center">
          <CardTitle className="text-3xl font-bold text-card-foreground">
            Vite + React
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 p-0">
          <Button onClick={() => setCount(c => c + 1)}>count is {count}</Button>
          <p className="text-muted-foreground">
            Edit <code>src/pages/HomePage.tsx</code> and save to test HMR
          </p>
        </CardContent>
      </Card>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      {enableAuth && user ? (
        <RlsSupabaseSmokePanel />
      ) : enableAuth ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
          <Link
            to="/auth"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{' '}
          to run the Supabase RLS read/write check on the home page.
        </p>
      ) : null}

      {isDev && (
        <p className="text-xs text-muted-foreground" data-testid="api-url">
          API: {apiBaseUrl}
        </p>
      )}
    </div>
  );
}
