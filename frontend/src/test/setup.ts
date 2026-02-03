import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock lucide-react icons (can be undefined when lazy-loaded in router tests)
vi.mock('lucide-react', () => ({
  Campaign: () => null,
  Users: () => null,
  Settings: () => null,
  Plus: () => null,
  Home: () => null,
  SearchX: () => null,
  AlertCircle: () => null,
  Menu: () => null,
  X: () => null,
  Loader2: () => null,
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
