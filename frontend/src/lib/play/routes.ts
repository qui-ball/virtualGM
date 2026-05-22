/** Play experience routes (feature 04). */
export const PLAY_ROUTES = {
  campaign: '/campaign',
  session: '/play',
} as const;

export type PlayRoutePath = (typeof PLAY_ROUTES)[keyof typeof PLAY_ROUTES];

const PLAY_PATHS: readonly string[] = Object.values(PLAY_ROUTES);

export function isPlayPath(pathname: string): boolean {
  return PLAY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
