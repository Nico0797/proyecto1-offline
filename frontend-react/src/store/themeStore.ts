import { create } from 'zustand';
import {
  ThemePreference,
  ResolvedTheme,
  initializeThemePreference,
  readAppearanceSettings,
  resolveThemePreference,
  writeAppearanceSettings,
} from '../utils/theme';

interface ThemeState {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  hydrated: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemePreference) => void;
  hydrateTheme: () => void;
  syncWithSystem: () => void;
}

const initialThemeState = initializeThemePreference();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialThemeState.theme,
  resolvedTheme: initialThemeState.resolvedTheme,
  hydrated: true,
  toggleTheme: () => {
    const nextTheme = get().resolvedTheme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },
  setTheme: (theme) => {
    const nextAppearance = writeAppearanceSettings({ theme });
    const resolvedTheme = resolveThemePreference(nextAppearance.theme);
    set({
      theme: nextAppearance.theme,
      resolvedTheme,
      hydrated: true,
    });
  },
  hydrateTheme: () => {
    const appearance = readAppearanceSettings();
    const resolvedTheme = resolveThemePreference(appearance.theme);
    set({
      theme: appearance.theme,
      resolvedTheme,
      hydrated: true,
    });
  },
  syncWithSystem: () => {
    if (get().theme !== 'system') {
      return;
    }

    const appearance = readAppearanceSettings();
    const resolvedTheme = resolveThemePreference(appearance.theme);
    set({
      theme: appearance.theme,
      resolvedTheme,
      hydrated: true,
    });
  },
}));

export const initializeTheme = () => {
  const initialState = initializeThemePreference();
  useThemeStore.setState({
    theme: initialState.theme,
    resolvedTheme: initialState.resolvedTheme,
    hydrated: true,
  });
  return initialState;
};
