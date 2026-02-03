import { ContentArea } from '@/components/layout';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes/constants';
import { Campaign, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Home page component
 *
 * This is the landing page of the application, providing an overview
 * and quick navigation to main features.
 */
export function HomePage() {
  usePageTitle('Home');
  return (
    <ContentArea maxWidth="container" padding="md">
      <div className="space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            Welcome to Virtual GM
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Your digital companion for tabletop RPG adventures. Manage
            campaigns, characters, and game sessions with ease.
          </p>
        </section>

        {/* Quick Navigation Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Get Started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickNavCard
              title="Campaigns"
              description="Create and manage your RPG campaigns"
              icon={<Campaign className="h-8 w-8" />}
              href={ROUTES.CAMPAIGNS}
            />
            <QuickNavCard
              title="Characters"
              description="Build and track player characters"
              icon={<Users className="h-8 w-8" />}
              href={ROUTES.CHARACTERS}
            />
            <QuickNavCard
              title="Settings"
              description="Configure your app preferences"
              icon={<Settings className="h-8 w-8" />}
              href={ROUTES.SETTINGS}
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Campaign Management"
              description="Organize your game sessions, track storylines, and manage NPCs all in one place."
            />
            <FeatureCard
              title="Character Builder"
              description="Create detailed character sheets with stats, abilities, and backstories."
            />
            <FeatureCard
              title="Mobile Support"
              description="Access your campaigns and characters on any device, anywhere."
            />
            <FeatureCard
              title="Real-time Updates"
              description="Stay synchronized with your game group with live updates."
            />
          </div>
        </section>
      </div>
    </ContentArea>
  );
}

interface QuickNavCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function QuickNavCard({ title, description, icon, href }: QuickNavCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group',
        'bg-card border rounded-lg p-6',
        'hover:border-primary hover:shadow-md',
        'transition-all duration-200',
        'flex flex-col items-center text-center space-y-3',
        'min-h-[44px]', // Touch-friendly
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <div className="text-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="bg-card border rounded-lg p-6 space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
