import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import viteLogo from '/vite.svg';
import { Button } from '@/components/ui/button';
import { apiBaseUrl, isDev } from '@/config';
import '../styles/App.css';

/**
 * Home page placeholder. Replace with dashboard or landing content.
 */
export function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-center gap-4">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1 className="text-3xl font-bold text-foreground">Vite + React</h1>
      <div className="card flex flex-col items-center gap-3">
        <Button onClick={() => setCount(c => c + 1)}>count is {count}</Button>
        <p className="text-muted-foreground">
          Edit <code>src/pages/HomePage.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      {isDev && (
        <p className="text-xs text-muted-foreground" data-testid="api-url">
          API: {apiBaseUrl}
        </p>
      )}
    </div>
  );
}
