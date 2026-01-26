# Layout Components

This directory contains the core layout components for the Virtual GM application.

## Components

### Header

Application header with branding and optional actions.

**Features:**
- Responsive design (mobile-first)
- Sticky positioning
- App branding/logo area
- Mobile-optimized

**Usage:**
```tsx
import { Header } from '@/components/layout';

<Header 
  appName="Virtual GM"
  logo={<Logo />}
>
  <UserMenu />
</Header>
```

### Navigation

Mobile-friendly navigation component with drawer menu.

**Features:**
- Drawer menu on mobile (< 768px)
- Horizontal navigation on desktop
- Touch-friendly (44x44px minimum targets)
- Accessible with ARIA labels

**Usage:**
```tsx
import { Navigation } from '@/components/layout';

<Navigation
  items={[
    { id: 'home', label: 'Home', href: '/' },
    { id: 'campaigns', label: 'Campaigns', href: '/campaigns', active: true },
  ]}
  onItemClick={(item) => console.log('Clicked:', item)}
/>
```

### ContentArea

Main content container with responsive padding and max-width options.

**Features:**
- Responsive padding
- Flexible max-width options
- Proper scroll handling
- Mobile-optimized spacing

**Usage:**
```tsx
import { ContentArea } from '@/components/layout';

<ContentArea maxWidth="container" padding="md">
  <YourContent />
</ContentArea>
```

## Complete Layout Example

```tsx
import { Header, Navigation, ContentArea } from '@/components/layout';

function AppLayout() {
  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'campaigns', label: 'Campaigns', href: '/campaigns' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header appName="Virtual GM">
        <Navigation items={navItems} />
      </Header>
      
      <ContentArea maxWidth="container" padding="md">
        {/* Your page content */}
      </ContentArea>
    </div>
  );
}
```

## Testing

All components include comprehensive unit tests using Vitest and React Testing Library.

Run tests:
```bash
npm run test
```

## Best Practices

1. **Mobile-First**: All components use mobile-first responsive design
2. **Accessibility**: Proper ARIA labels and semantic HTML
3. **Touch Targets**: Minimum 44x44px for mobile interactions
4. **TypeScript**: Fully typed with exported interfaces
5. **Reusability**: Components accept props for customization
