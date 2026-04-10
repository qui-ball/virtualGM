import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as loadFonts from './load-fonts';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './use-theme';

vi.mock('./load-fonts', () => ({
  loadFontsForTheme: vi.fn(() => Promise.resolve()),
}));

function Probe() {
  const { themeId, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-id">{themeId}</span>
      <button type="button" onClick={() => void setTheme('neon-syndicate')}>
        apply-neon
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.mocked(loadFonts.loadFontsForTheme).mockImplementation(() =>
      Promise.resolve()
    );
    document.documentElement.setAttribute('data-theme', 'dark-fantasy');
    localStorage.removeItem('virtualgm-ui-theme');
  });

  it('awaits loadFontsForTheme before setting data-theme on the document', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const order: string[] = [];
    let calls = 0;

    vi.mocked(loadFonts.loadFontsForTheme).mockImplementation(async (id) => {
      calls++;
      if (calls === 1) {
        expect(id).toBe('dark-fantasy');
        return;
      }
      expect(id).toBe('neon-syndicate');
      order.push('load-start');
      await gate;
      order.push('load-end');
    });

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply-neon/i }));

    await waitFor(() => expect(order).toEqual(['load-start']));
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'dark-fantasy'
    );

    release();

    await waitFor(() => expect(order).toEqual(['load-start', 'load-end']));
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'neon-syndicate'
    );
    await waitFor(() =>
      expect(screen.getByTestId('theme-id')).toHaveTextContent(
        'neon-syndicate'
      )
    );
  });
});
