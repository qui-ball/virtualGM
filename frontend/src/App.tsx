import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth';
import { Header, ContentArea } from '@/components/layout';
import type { NavLink } from '@/components/layout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ChatPage } from '@/pages/ChatPage';
import { ResponsiveTestPage } from '@/pages/ResponsiveTestPage';
import { AuthPage } from '@/pages/AuthPage';
import { enableAuth } from '@/config';
import { useEffect, useState } from 'react';
import { getCampaigns } from '@/api/client';
import type { CampaignOption } from '@/components/layout';
import './styles/App.css';

const navLinks: NavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Play', to: '/play' },
  { label: 'Responsive test', to: '/responsive-test' },
];

function App() {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const data = await getCampaigns();
        if (!isMounted) {
          return;
        }
        const options = data.campaigns.map((campaign) => ({
          id: campaign.id,
          label: campaign.name,
        }));
        setCampaignOptions(options);
        setCampaignId((currentId) => {
          if (currentId && options.some((option) => option.id === currentId)) {
            return currentId;
          }
          return options[0]?.id ?? null;
        });
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        title="Virtual GM"
        navLinks={navLinks}
        campaignId={campaignId ?? ''}
        campaignOptions={campaignOptions}
        onCampaignChange={setCampaignId}
      />
      <ContentArea>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {enableAuth ? (
            <Route path="/auth" element={<AuthPage />} />
          ) : (
            <Route path="/auth" element={<Navigate to="/" replace />} />
          )}
          <Route
            path="/play"
            element={
              <ProtectedRoute>
                <ChatPage campaignId={campaignId} />
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
