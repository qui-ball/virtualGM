# Environment Variables Usage Guide

This guide explains how to use environment variables in the Virtual GM frontend application.

## Quick Start

1. **Copy the example file:**

   ```bash
   cp .env.example .env.development
   # Edit .env.development with your values
   ```

2. **Use environment variables in your code:**

   ```typescript
   import { getApiUrl, getAppName, getEnvConfig } from '@/utils/env';

   const apiUrl = getApiUrl();
   const appName = getAppName();
   ```

## Available Environment Variables

### Required Variables

- **`VITE_API_URL`** - Backend API URL
  - Development: `http://localhost:8000`
  - Production: `https://api.virtualgm.com`

### Optional Variables

- **`VITE_CAPACITOR_DEV_SERVER_URL`** - Capacitor live reload URL
- **`VITE_CAPACITOR_CLEARTEXT`** - Enable HTTP for Android (`true`/`false`)
- **`VITE_APP_ENV`** - Application environment (`development`/`staging`/`production`)
- **`VITE_APP_NAME`** - Application name (default: `Virtual GM`)

## Usage Examples

### Basic Usage

```typescript
import { getApiUrl, getAppName } from '@/utils/env';

function MyComponent() {
  const apiUrl = getApiUrl();
  const appName = getAppName();

  return <div>Connecting to {apiUrl}</div>;
}
```

### Complete Configuration

```typescript
import { getEnvConfig } from '@/utils/env';

function AppConfig() {
  const config = getEnvConfig();

  return (
    <div>
      <p>Environment: {config.appEnv}</p>
      <p>API URL: {config.apiUrl}</p>
      <p>App Name: {config.appName}</p>
    </div>
  );
}
```

### Validation

```typescript
import { validateEnvConfig } from '@/utils/env';

function validateEnvironment() {
  const validation = validateEnvConfig();

  if (!validation.valid) {
    console.error('Environment configuration errors:', validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn('Environment warnings:', validation.warnings);
  }
}
```

### Debug Logging

```typescript
import { logEnvConfig } from '@/utils/env';

// In development, logs all environment configuration
logEnvConfig();
// Only works in development mode - automatically disabled in production
```

## Environment Files

Vite automatically loads environment files in this order (later files override earlier ones):

1. `.env` - Default for all environments
2. `.env.local` - Local overrides (gitignored)
3. `.env.[mode]` - Mode-specific (e.g., `.env.development`)
4. `.env.[mode].local` - Mode-specific local overrides (gitignored)

### Modes

- **Development**: `npm run dev` → uses `.env.development`
- **Production**: `npm run build` → uses `.env.production`
- **Test**: `npm test` → uses `.env.test` (if exists)

## Best Practices

1. **Never commit sensitive data**
   - Use `.env.example` for templates
   - Add `.env*` to `.gitignore` (except `.env.example`)

2. **Use type-safe utilities**
   - Always use utilities from `@/utils/env`
   - Don't access `import.meta.env` directly

3. **Validate in development**
   - Call `validateEnvConfig()` during app initialization
   - Use `logEnvConfig()` for debugging

4. **Provide defaults**
   - Environment variables should have sensible defaults
   - Document required vs optional variables

## Direct Access (Not Recommended)

While you can access environment variables directly via `import.meta.env.VITE_*`, it's recommended to use the utilities:

```typescript
// ❌ Not recommended
const apiUrl = import.meta.env.VITE_API_URL;

// ✅ Recommended
import { getApiUrl } from '@/utils/env';
const apiUrl = getApiUrl();
```

The utilities provide:

- Type safety
- Validation
- Default values
- Better error messages

## Testing

Environment variables in tests are handled by Vitest. Use `vi.stubEnv()`:

```typescript
import { vi } from 'vitest';
import { getApiUrl } from '@/utils/env';

it('uses environment variable', () => {
  vi.stubEnv('VITE_API_URL', 'http://test-api.com');
  expect(getApiUrl()).toBe('http://test-api.com');
});
```

## Troubleshooting

### Variables not accessible

1. **Check prefix**: Must start with `VITE_`
2. **Check file location**: Must be in `frontend/` directory
3. **Restart dev server**: Changes require restart
4. **Check mode**: Ensure correct `.env.[mode]` file exists

### Variables undefined

1. **Check spelling**: Variable names are case-sensitive
2. **Check .gitignore**: Ensure file isn't ignored
3. **Check Vite config**: Should work by default

### Build-time vs Runtime

- **Build-time**: Variables are embedded at build time
- **Runtime**: Variables cannot be changed after build
- **Mobile**: Same values for iOS, Android, and web

## See Also

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [MOBILE_DEVELOPMENT.md](./MOBILE_DEVELOPMENT.md) - Mobile-specific configuration
