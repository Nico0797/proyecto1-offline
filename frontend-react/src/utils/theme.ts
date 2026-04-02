export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type AppearanceSettings = {
  theme: ThemePreference;
  fontSize: 'sm' | 'md' | 'lg';
  density: 'compact' | 'normal';
};

const APPEARANCE_STORAGE_KEY = 'appearance_settings';
const LEGACY_THEME_STORAGE_KEY = 'theme-storage';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
const AUTH_THEME_DARK_PATHS = new Set([
  '/',
  '/login',
  '/team-login',
  '/register',
  '/accept-invite',
  '/admin/login',
]);

const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'system',
  fontSize: 'md',
  density: 'normal',
};

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const parseJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeThemePreference = (value: unknown): ThemePreference => {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  if (value === 'auto') {
    return 'system';
  }
  return DEFAULT_APPEARANCE_SETTINGS.theme;
};

const normalizeFontSize = (value: unknown): AppearanceSettings['fontSize'] => {
  if (value === 'sm' || value === 'md' || value === 'lg') {
    return value;
  }
  return DEFAULT_APPEARANCE_SETTINGS.fontSize;
};

const normalizeDensity = (value: unknown): AppearanceSettings['density'] => {
  if (value === 'compact' || value === 'normal') {
    return value;
  }
  return DEFAULT_APPEARANCE_SETTINGS.density;
};

const readLegacyThemePreference = (): ThemePreference | null => {
  if (!isBrowser()) return null;
  const legacy = parseJson(window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY));
  const legacyTheme = legacy?.state?.theme ?? legacy?.theme;
  if (legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'system' || legacyTheme === 'auto') {
    return normalizeThemePreference(legacyTheme);
  }
  return null;
};

export const getDefaultAppearanceSettings = (): AppearanceSettings => ({ ...DEFAULT_APPEARANCE_SETTINGS });

export const readAppearanceSettings = (): AppearanceSettings => {
  if (!isBrowser()) {
    return getDefaultAppearanceSettings();
  }

  const stored = parseJson(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)) || {};
  const legacyTheme = readLegacyThemePreference();

  return {
    theme: normalizeThemePreference(stored.theme ?? legacyTheme),
    fontSize: normalizeFontSize(stored.fontSize),
    density: normalizeDensity(stored.density),
  };
};

export const writeAppearanceSettings = (patch: Partial<AppearanceSettings>): AppearanceSettings => {
  const current = readAppearanceSettings();
  const next: AppearanceSettings = {
    theme: normalizeThemePreference(patch.theme ?? current.theme),
    fontSize: normalizeFontSize(patch.fontSize ?? current.fontSize),
    density: normalizeDensity(patch.density ?? current.density),
  };

  if (isBrowser()) {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
  }

  return next;
};

export const getSystemTheme = (): ResolvedTheme => {
  if (!isBrowser()) {
    return 'light';
  }
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
};

export const resolveThemePreference = (theme: ThemePreference): ResolvedTheme => {
  return theme === 'system' ? getSystemTheme() : theme;
};

export const getForcedThemeForPath = (pathname: string | null | undefined): ResolvedTheme | null => {
  if (!pathname) {
    return null;
  }

  return AUTH_THEME_DARK_PATHS.has(pathname) ? 'dark' : null;
};

export const applyResolvedTheme = (theme: ResolvedTheme) => {
  if (!isBrowser()) return;

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export const initializeThemePreference = (pathname?: string) => {
  const appearance = readAppearanceSettings();
  const resolvedTheme = resolveThemePreference(appearance.theme);
  const forcedTheme = getForcedThemeForPath(pathname ?? (isBrowser() ? window.location.pathname : ''));
  applyResolvedTheme(forcedTheme ?? resolvedTheme);
  return {
    theme: appearance.theme,
    resolvedTheme,
    appearance,
    forcedTheme,
  };
};

export const getSystemThemeMediaQuery = () => {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia(SYSTEM_THEME_QUERY);
};
