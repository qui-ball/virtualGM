import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from '../usePageTitle';

describe('usePageTitle', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = 'Original Title';
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets the page title on mount', () => {
    renderHook(() => usePageTitle('Test Page'));
    expect(document.title).toBe('Test Page - Virtual GM');
  });

  it('uses custom app name when provided', () => {
    renderHook(() => usePageTitle('Test Page', 'Custom App'));
    expect(document.title).toBe('Test Page - Custom App');
  });

  it('restores previous title on unmount', () => {
    document.title = 'Previous Title';
    const { unmount } = renderHook(() => usePageTitle('Test Page'));

    expect(document.title).toBe('Test Page - Virtual GM');

    unmount();
    expect(document.title).toBe('Previous Title');
  });

  it('updates title when title changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'First Title' },
    });

    expect(document.title).toBe('First Title - Virtual GM');

    rerender({ title: 'Second Title' });
    expect(document.title).toBe('Second Title - Virtual GM');
  });
});
