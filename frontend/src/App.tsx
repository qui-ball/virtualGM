import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import type { NavLink } from '@/components/layout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CampaignPage } from '@/pages/CampaignPage';
import { SessionPage } from '@/pages/SessionPage';
import { ResponsiveTestPage } from '@/pages/ResponsiveTestPage';
import { AccountGatePage } from '@/pages/AccountGatePage';
import { AuthPage } from '@/pages/AuthPage';
import { enableAuth, isDev } from '@/config';
import './styles/App.css';

/** Campaign-first: no bare Play link (avoids legacy session without a playthrough). */
const navLinks: NavLink[] = [
  { label: 'Campaigns', to: '/campaign' },
  ...(isDev
    ? [{ label: 'Responsive test', to: '/responsive-test' } satisfies NavLink]
    : []),
];

function App() {
  return (
    <Routes>
      <Route element={<AppLayout title="Virtual GM" navLinks={navLinks} />}>
        <Route path="/" element={<Navigate to="/campaign" replace />} />
        <Route
          path="/auth"
          element={enableAuth ? <AuthPage /> : <AccountGatePage />}
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
