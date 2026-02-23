import { Routes, Route } from 'react-router-dom';
import { Header, ContentArea } from '@/components/layout';
import type { NavLink } from '@/components/layout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ResponsiveTestPage } from '@/pages/ResponsiveTestPage';
import './styles/App.css';

const navLinks: NavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Responsive test', to: '/responsive-test' },
];

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header title="Virtual GM" navLinks={navLinks} />
      <ContentArea>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/responsive-test" element={<ResponsiveTestPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ContentArea>
    </div>
  );
}

export default App;
