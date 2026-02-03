import { useEffect } from 'react';

/**
 * Hook to manage page title
 *
 * Updates the document title when the component mounts and restores
 * it when the component unmounts.
 *
 * @param title - The page title (will be prefixed with app name)
 * @param appName - The application name (defaults to "Virtual GM")
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   usePageTitle('Home');
 *   return <div>...</div>;
 * }
 * ```
 */
export function usePageTitle(
  title: string,
  appName: string = 'Virtual GM'
): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} - ${appName}`;

    return () => {
      document.title = previousTitle;
    };
  }, [title, appName]);
}
