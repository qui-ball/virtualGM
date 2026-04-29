import { FONT_LINK_DATA_ATTR } from './constants';
import type { ThemeId } from './theme-ids';
import { getThemeRegistryEntry } from './registry';

export type LoadFontsOptions = {
  document?: Document;
  signal?: AbortSignal;
};

/**
 * Injects that theme’s Google Fonts stylesheet once (deduped per theme id).
 * `dark-fantasy` resolves immediately (system stack — no network).
 *
 * In Vitest (`import.meta.env.TEST`), resolves after insert without waiting for `load`
 * (jsdom does not reliably fire stylesheet load events).
 */
export function loadFontsForTheme(
  themeId: ThemeId,
  options?: LoadFontsOptions
): Promise<void> {
  const doc = options?.document ?? document;
  const entry = getThemeRegistryEntry(themeId);
  const href = entry.googleFontsStylesheetUrl;

  if (!href) {
    return Promise.resolve();
  }

  if (options?.signal?.aborted) {
    return Promise.reject(
      new DOMException('Theme font load aborted', 'AbortError')
    );
  }

  const selector = `link[rel="stylesheet"][${FONT_LINK_DATA_ATTR}="${themeId}"]`;
  if (doc.head.querySelector(selector)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(FONT_LINK_DATA_ATTR, themeId);

    const cleanup = () => {
      options?.signal?.removeEventListener('abort', onAbort);
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const onAbort = () => {
      link.remove();
      cleanup();
      reject(new DOMException('Theme font load aborted', 'AbortError'));
    };

    options?.signal?.addEventListener('abort', onAbort);

    if (import.meta.env.TEST) {
      doc.head.appendChild(link);
      queueMicrotask(finish);
      return;
    }

    link.addEventListener('load', finish);
    link.addEventListener('error', finish);
    doc.head.appendChild(link);
  });
}
