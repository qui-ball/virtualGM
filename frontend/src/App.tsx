import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { Header, ContentArea } from '@/components/layout';
import type { NavLink } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { ResponsiveTestPage } from '@/pages/ResponsiveTestPage';
import './styles/App.css';

type View = 'home' | 'responsive-test';

function App() {
  const [count, setCount] = useState(0);
  const [view, setView] = useState<View>('home');

  const navLinks: NavLink[] = [
    { label: 'Home', onClick: () => setView('home') },
    { label: 'Responsive test', onClick: () => setView('responsive-test') },
  ];

  return (
    <div className="flex min-h-svh flex-col">
      <Header title="Virtual GM" navLinks={navLinks} />
      <ContentArea>
        {view === 'responsive-test' ? (
          <ResponsiveTestPage />
        ) : (
          <HomeContent
            count={count}
            onCountClick={() => setCount((c) => c + 1)}
          />
        )}
      </ContentArea>
    </div>
  );
}

function HomeContent({
  count,
  onCountClick,
}: {
  count: number;
  onCountClick: () => void;
}) {
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
      <h1 className="text-3xl font-bold text-foreground">
        Vite + React
      </h1>
      <div className="card flex flex-col items-center gap-3">
        <Button onClick={onCountClick}>
          count is {count}
        </Button>
        <p className="text-muted-foreground">
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
