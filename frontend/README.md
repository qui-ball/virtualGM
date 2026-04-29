# Virtual GM – Frontend

React + TypeScript + Vite frontend for the Virtual GM RPG application (mobile-first responsive web app).

**UI stack:** [Tailwind CSS](https://tailwindcss.com/) v4 (via `@tailwindcss/vite`) + [shadcn/ui](https://ui.shadcn.com/) (new-york style). Components live in `src/components/ui/`; add more with `npx shadcn@latest add <component>`.

## Project structure

Folder layout and conventions are documented in **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**. Summary:

- `src/components/` – Reusable UI (layout: Header, Nav, etc.; common: Button, Card, etc.)
- `src/pages/` – Page-level views
- `src/styles/` – Global styles and theme
- `src/theme/` – Theme ids + normalization (unit-tested; used by UI theming)
- `src/utils/` – Utility functions
- `src/types/` – TypeScript type definitions
- `src/App.tsx` / `src/main.tsx` – App root and entry point

## Quick start

```bash
npm install
npm run dev      # Development server (http://localhost:5173)
npm run build    # Production build
npm run type-check  # TypeScript check
npm run test:run # Vitest (single run)
npm run test     # Vitest watch mode
```

## Responsive design

**Breakpoints (mobile-first):** **mobile** &lt; 768px, **tablet** 768px+, **desktop** 1024px+. Use Tailwind prefixes `md:` and `lg:`; optional `useBreakpoint()` from `@/hooks` for JS.

**Touch targets:** Minimum 44×44px for interactive elements (CSS var `--touch-target-min`). Layout (Header, Navigation) uses 44px; shadcn Button default is 36px — use `size="lg"` for primary actions on mobile when needed.

**Testing:** Run `npm run dev`, open the app, click **Responsive test page**, and use the viewport checklist there. Resize or use dev tools device toolbar to verify mobile, tablet, and desktop.

## React + TypeScript + Vite (template)

This project uses a minimal React + Vite setup with HMR and ESLint.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
