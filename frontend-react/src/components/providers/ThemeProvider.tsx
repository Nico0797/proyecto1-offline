import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { applyResolvedTheme, getForcedThemeForPath, getSystemThemeMediaQuery, ResolvedTheme } from '../../utils/theme';

type ThemeOverrideContextValue = {
  effectiveTheme: ResolvedTheme;
  setThemeOverride: (id: symbol, theme: ResolvedTheme | null) => void;
};

const ThemeOverrideContext = createContext<ThemeOverrideContextValue | null>(null);

export const useEffectiveTheme = () => {
  const context = useContext(ThemeOverrideContext);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  return context?.effectiveTheme ?? resolvedTheme;
};

export const useForcedTheme = (theme: ResolvedTheme | null) => {
  const context = useContext(ThemeOverrideContext);
  const overrideIdRef = useRef<symbol | null>(null);

  if (!overrideIdRef.current) {
    overrideIdRef.current = Symbol('theme-override');
  }

  useLayoutEffect(() => {
    if (!context) {
      return;
    }

    context.setThemeOverride(overrideIdRef.current!, theme);

    return () => {
      context.setThemeOverride(overrideIdRef.current!, null);
    };
  }, [context, theme]);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const hydrateTheme = useThemeStore((state) => state.hydrateTheme);
  const syncWithSystem = useThemeStore((state) => state.syncWithSystem);
  const theme = useThemeStore((state) => state.theme);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const [overrides, setOverrides] = useState<Map<symbol, ResolvedTheme>>(new Map());

  const routeFallbackTheme = getForcedThemeForPath(location.pathname);
  const overrideThemes = Array.from(overrides.values());
  const forcedTheme = (overrideThemes.length > 0 ? overrideThemes[overrideThemes.length - 1] : null) ?? routeFallbackTheme;
  const effectiveTheme = forcedTheme ?? resolvedTheme;

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    const mediaQuery = getSystemThemeMediaQuery();
    if (!mediaQuery) return;

    const handleChange = () => {
      if (useThemeStore.getState().theme === 'system') {
        useThemeStore.getState().syncWithSystem();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [syncWithSystem]);

  useEffect(() => {
    if (theme === 'system') {
      syncWithSystem();
    }
  }, [theme, syncWithSystem]);

  useLayoutEffect(() => {
    applyResolvedTheme(effectiveTheme);
  }, [effectiveTheme]);

  const setThemeOverride = useCallback((id: symbol, nextTheme: ResolvedTheme | null) => {
    setOverrides((current) => {
      const existingTheme = current.get(id) ?? null;
      if (existingTheme === nextTheme) {
        return current;
      }

      const next = new Map(current);
      if (nextTheme) {
        next.set(id, nextTheme);
      } else {
        next.delete(id);
      }

      return next;
    });
  }, []);

  const contextValue = useMemo<ThemeOverrideContextValue>(
    () => ({
      effectiveTheme,
      setThemeOverride,
    }),
    [effectiveTheme, setThemeOverride],
  );

  return <ThemeOverrideContext.Provider value={contextValue}>{children}</ThemeOverrideContext.Provider>;
};
