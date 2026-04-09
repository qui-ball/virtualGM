import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/auth';
import { Header, ContentArea } from '@/components/layout';
import type { NavLink } from '@/components/layout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ChatPage } from '@/pages/ChatPage';
import { ResponsiveTestPage } from '@/pages/ResponsiveTestPage';
import { AuthPage } from '@/pages/AuthPage';
import './styles/App.css';

const navLinks: NavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Play', to: '/play' },
  { label: 'Responsive test', to: '/responsive-test' },
];

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header title="Virtual GM" navLinks={navLinks} />
      <ContentArea>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/play"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="/responsive-test" element={<ResponsiveTestPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ContentArea>
    </div>
  );
}

export default App;
