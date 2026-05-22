import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import type { NavLink } from '@/components/layout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CampaignPage } from '@/pages/CampaignPage';
import { SessionPage } from '@/pages/SessionPage';
import { ResponsiveTestPage } from '@/pages/ResponsiveTestPage';
import { AuthPage } from '@/pages/AuthPage';
import { enableAuth } from '@/config';
import './styles/App.css';

const navLinks: NavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Campaign', to: '/campaign' },
  { label: 'Play', to: '/play' },
  { label: 'Responsive test', to: '/responsive-test' },
];

function App() {
  return (
    <Routes>
      <Route element={<AppLayout title="Virtual GM" navLinks={navLinks} />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/auth"
          element={enableAuth ? <AuthPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/campaign"
          element={
            <ProtectedRoute>
              <CampaignPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <SessionPage />
            </ProtectedRoute>
          }
        />
        <Route path="/responsive-test" element={<ResponsiveTestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
