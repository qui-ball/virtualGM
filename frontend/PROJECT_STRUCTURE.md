# Project Structure

This document describes the organization and structure of the Virtual GM frontend application.

## Directory Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components (Header, Nav, Footer, etc.)
│   │   ├── common/         # Common/reusable UI components (Buttons, Cards, etc.)
│   │   └── index.ts        # Central export point for components
│   ├── pages/              # Page-level components (full screens/views)
│   ├── styles/             # Global styles, theme, CSS files
│   │   ├── index.css       # Global styles and CSS reset
│   │   └── App.css         # App-specific styles
│   ├── utils/              # Utility functions and helpers
│   │   └── index.ts        # Utility function exports
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Type definition exports
│   ├── assets/             # Static assets (images, icons, etc.)
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── public/                  # Public static assets
├── dist/                   # Production build output (gitignored)
├── node_modules/           # Dependencies (gitignored)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript root configuration
├── tsconfig.app.json       # TypeScript app configuration
├── tsconfig.node.json      # TypeScript Node/Vite configuration
├── vite.config.ts          # Vite build configuration
└── README.md               # Project documentation
```

## File Organization Conventions

### Naming Conventions

Following the development standards:

- **Files:** `kebab-case.ts` or `kebab-case.tsx` (e.g., `character-sheet.tsx`)
- **Components:** `PascalCase` (e.g., `CharacterSheet`)
- **Functions/Variables:** `camelCase` (e.g., `getCharacterStats`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_LEVEL`)
- **Types/Interfaces:** `PascalCase` (e.g., `CharacterData`)

### Component Organization

#### Layout Components (`src/components/layout/`)
Components that define the overall structure and layout of the application:
- `Header.tsx` - Application header/navigation bar
- `Navigation.tsx` - Navigation menu or drawer
- `Footer.tsx` - Application footer
- `ContentArea.tsx` - Main content container
- `Sidebar.tsx` - Sidebar component (if needed)

#### Common Components (`src/components/common/`)
Reusable UI components used throughout the application:
- `Button.tsx` - Button component
- `Input.tsx` - Input field component
- `Card.tsx` - Card container component
- `Modal.tsx` - Modal/dialog component
- `LoadingSpinner.tsx` - Loading indicator
- `ErrorMessage.tsx` - Error message display

#### Page Components (`src/pages/`)
Full page/screen components that represent complete views. Each is used as a route element in `App.tsx`:
- `HomePage.tsx` - Home page
- `ResponsiveTestPage.tsx` - Responsive design test page
- `NotFoundPage.tsx` - 404 placeholder

### Routing

The app uses **React Router** (`react-router-dom`). The router is set up in `main.tsx` (`BrowserRouter`) and routes are defined in `App.tsx` with `Routes` and `Route`. Current routes: `/` (Home), `/responsive-test` (Responsive test), and `*` (NotFound). The layout `Navigation` component uses `NavLink` for internal routes (with active styling) and supports external `href` and `onClick` buttons.

### Import Patterns

**Preferred:** Import from specific files for better tree-shaking
```typescript
import { Button } from '@/components/common/Button';
import { Header } from '@/components/layout/Header';
```

**Alternative:** Import from index files (if barrel exports are set up)
```typescript
import { Button, Card } from '@/components/common';
import { Header, Navigation } from '@/components/layout';
```

### Type Definitions (`src/types/`)
Central location for TypeScript type definitions:
- `character.ts` - Character-related types
- `campaign.ts` - Campaign-related types
- `api.ts` - API response types
- `common.ts` - Common/shared types

### Utility Functions (`src/utils/`)
Helper functions and utilities:
- `formatDate.ts` - Date formatting utilities
- `validation.ts` - Validation helpers
- `api.ts` - API client utilities
- `constants.ts` - Application constants

### Styles (`src/styles/`)
- `index.css` - Global styles, CSS reset, theme variables
- `App.css` - Application-specific styles
- Component-specific styles can be co-located with components or in this directory

## Best Practices

1. **Component Structure:**
   - Keep components small and focused (single responsibility)
   - Use composition over inheritance
   - Extract reusable logic into custom hooks
   - Separate presentational and container components

2. **File Organization:**
   - Co-locate related files (component + styles + tests)
   - Use index files for cleaner imports
   - Group related functionality together

3. **Type Safety:**
   - Define types in `src/types/` directory
   - Use TypeScript for all components
   - Avoid `any` types, use proper types or `unknown`

4. **Code Organization:**
   - Keep functions small (< 50 lines, ideally < 30)
   - Use meaningful variable and function names
   - Add JSDoc comments for complex functions
   - Follow the established naming conventions

## Adding New Components

When adding a new component:

1. Determine if it's a layout, common, or page component
2. Create the component file in the appropriate directory
3. Use PascalCase for component names
4. Export from the directory's `index.ts` file (optional, for convenience)
5. Add TypeScript types if needed in `src/types/`
6. Add styles (co-located or in `src/styles/`)

## Example: Creating a New Component

```typescript
// src/components/common/Button.tsx
import { ButtonHTMLAttributes } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

export function Button({ variant = 'primary', size = 'medium', ...props }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      {...props}
    />
  );
}
```

```typescript
// src/components/common/index.ts
export { Button } from './Button';
```

```typescript
// Usage in another component
import { Button } from '@/components/common/Button';
// or
import { Button } from '@/components/common';
```
