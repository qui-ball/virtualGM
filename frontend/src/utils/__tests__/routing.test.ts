import { describe, it, expect, vi } from 'vitest';
import {
  isRoute,
  isRoutePrefix,
  getRouteName,
  navigateToRoute,
} from '../routing';
import { ROUTES } from '@/routes/constants';

describe('routing utilities', () => {
  describe('isRoute', () => {
    it('returns true for exact route match', () => {
      expect(isRoute('/', ROUTES.HOME)).toBe(true);
      expect(isRoute('/campaigns', ROUTES.CAMPAIGNS)).toBe(true);
    });

    it('returns false for non-matching routes', () => {
      expect(isRoute('/campaigns', ROUTES.HOME)).toBe(false);
      expect(isRoute('/', ROUTES.CAMPAIGNS)).toBe(false);
    });
  });

  describe('isRoutePrefix', () => {
    it('returns true when path starts with route', () => {
      expect(isRoutePrefix('/campaigns/123', ROUTES.CAMPAIGNS)).toBe(true);
      expect(isRoutePrefix('/characters/new', ROUTES.CHARACTERS)).toBe(true);
    });

    it('returns false when path does not start with route', () => {
      expect(isRoutePrefix('/home', ROUTES.CAMPAIGNS)).toBe(false);
      expect(isRoutePrefix('/settings', ROUTES.CHARACTERS)).toBe(false);
    });

    it('returns true for exact matches', () => {
      expect(isRoutePrefix('/', ROUTES.HOME)).toBe(true);
      expect(isRoutePrefix('/campaigns', ROUTES.CAMPAIGNS)).toBe(true);
    });
  });

  describe('getRouteName', () => {
    it('returns route name for valid route path', () => {
      expect(getRouteName('/')).toBe('HOME');
      expect(getRouteName('/campaigns')).toBe('CAMPAIGNS');
      expect(getRouteName('/characters')).toBe('CHARACTERS');
      expect(getRouteName('/settings')).toBe('SETTINGS');
    });

    it('returns null for unknown route path', () => {
      expect(getRouteName('/unknown')).toBe(null);
      expect(getRouteName('/test/route')).toBe(null);
    });
  });

  describe('navigateToRoute', () => {
    it('calls navigate with correct route', () => {
      const navigate = vi.fn();
      navigateToRoute(navigate, ROUTES.CAMPAIGNS);

      expect(navigate).toHaveBeenCalledWith(ROUTES.CAMPAIGNS, undefined);
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('calls navigate with options when provided', () => {
      const navigate = vi.fn();
      const options = { replace: true };
      navigateToRoute(navigate, ROUTES.HOME, options);

      expect(navigate).toHaveBeenCalledWith(ROUTES.HOME, options);
    });

    it('calls navigate with state option', () => {
      const navigate = vi.fn();
      const options = { state: { from: '/previous' } };
      navigateToRoute(navigate, ROUTES.CAMPAIGNS, options);

      expect(navigate).toHaveBeenCalledWith(ROUTES.CAMPAIGNS, options);
    });
  });
});
