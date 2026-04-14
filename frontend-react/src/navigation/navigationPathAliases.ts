export const NAVIGATION_PATH_ALIASES: Record<string, string> = {
  '/cash': '/treasury',
  '/caja': '/treasury',
  '/treasury-home': '/treasury',
  '/analytics': '/reports',
  '/analysis': '/reports',
  '/analiticas': '/reports',
};

export const normalizeNavigationPath = (path?: string | null): string => {
  const normalized = String(path || '').trim();
  if (!normalized) return '';
  return NAVIGATION_PATH_ALIASES[normalized] || normalized;
};

export const normalizeNavigationPaths = (paths?: Array<string | null | undefined>) => {
  return Array.from(
    new Set(
      (paths || [])
        .map((path) => normalizeNavigationPath(path))
        .filter(Boolean)
    )
  );
};
