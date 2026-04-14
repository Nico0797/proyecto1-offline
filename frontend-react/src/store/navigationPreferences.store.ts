import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeNavigationPaths } from '../navigation/navigationPathAliases';

export interface NavigationPreferences {
  hiddenPaths: string[];
  favoritePaths: string[];
}

const normalizePaths = (paths?: string[]) => normalizeNavigationPaths(paths);

export const buildDefaultNavigationPreferences = (favoritePaths?: string[]): NavigationPreferences => ({
  hiddenPaths: [],
  favoritePaths: normalizePaths(favoritePaths),
});

interface NavigationPreferencesState {
  preferencesByScope: Record<string, NavigationPreferences>;
  getScopeKey: (userId?: number | string | null, businessId?: number | string | null) => string;
  getPreferences: (scopeKey: string, defaults?: Partial<NavigationPreferences>) => NavigationPreferences;
  setPreferences: (scopeKey: string, preferences: NavigationPreferences) => void;
  patchPreferences: (scopeKey: string, patch: Partial<NavigationPreferences>) => void;
  setFavoritePaths: (scopeKey: string, favoritePaths: string[]) => void;
  setHiddenPaths: (scopeKey: string, hiddenPaths: string[]) => void;
  toggleFavorite: (scopeKey: string, path: string) => void;
  toggleHidden: (scopeKey: string, path: string) => void;
  moveFavorite: (scopeKey: string, path: string, direction: 'up' | 'down') => void;
  resetScope: (scopeKey: string, defaults?: NavigationPreferences) => void;
}

export const useNavigationPreferences = create<NavigationPreferencesState>()(
  persist(
    (set, get) => ({
      preferencesByScope: {},
      getScopeKey: (userId, businessId) => `nav:${userId || 'anon'}:${businessId || 'no-business'}`,
      getPreferences: (scopeKey, defaults) => {
        const current = get().preferencesByScope[scopeKey];
        return {
          hiddenPaths: normalizePaths(current?.hiddenPaths || defaults?.hiddenPaths),
          favoritePaths: normalizePaths(current?.favoritePaths || defaults?.favoritePaths),
        };
      },
      setPreferences: (scopeKey, preferences) => set((state) => ({
        preferencesByScope: {
          ...state.preferencesByScope,
          [scopeKey]: {
            hiddenPaths: normalizePaths(preferences.hiddenPaths),
            favoritePaths: normalizePaths(preferences.favoritePaths),
          },
        },
      })),
      patchPreferences: (scopeKey, patch) => {
        const current = get().getPreferences(scopeKey);
        get().setPreferences(scopeKey, {
          hiddenPaths: patch.hiddenPaths ?? current.hiddenPaths,
          favoritePaths: patch.favoritePaths ?? current.favoritePaths,
        });
      },
      setFavoritePaths: (scopeKey, favoritePaths) => {
        const current = get().getPreferences(scopeKey);
        get().setPreferences(scopeKey, {
          ...current,
          favoritePaths,
        });
      },
      setHiddenPaths: (scopeKey, hiddenPaths) => {
        const current = get().getPreferences(scopeKey);
        get().setPreferences(scopeKey, {
          ...current,
          hiddenPaths,
        });
      },
      toggleFavorite: (scopeKey, path) => {
        const current = get().getPreferences(scopeKey);
        const favoritePaths = current.favoritePaths.includes(path)
          ? current.favoritePaths.filter((item) => item !== path)
          : [...current.favoritePaths, path];
        get().setPreferences(scopeKey, {
          ...current,
          favoritePaths,
        });
      },
      toggleHidden: (scopeKey, path) => {
        const current = get().getPreferences(scopeKey);
        const hiddenPaths = current.hiddenPaths.includes(path)
          ? current.hiddenPaths.filter((item) => item !== path)
          : [...current.hiddenPaths, path];
        get().setPreferences(scopeKey, {
          ...current,
          hiddenPaths,
        });
      },
      moveFavorite: (scopeKey, path, direction) => {
        const current = get().getPreferences(scopeKey);
        const index = current.favoritePaths.indexOf(path);
        if (index === -1) return;
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= current.favoritePaths.length) return;
        const favoritePaths = [...current.favoritePaths];
        const [item] = favoritePaths.splice(index, 1);
        favoritePaths.splice(nextIndex, 0, item);
        get().setPreferences(scopeKey, {
          ...current,
          favoritePaths,
        });
      },
      resetScope: (scopeKey, defaults) => set((state) => {
        const next = { ...state.preferencesByScope };
        if (defaults) {
          next[scopeKey] = {
            hiddenPaths: normalizePaths(defaults.hiddenPaths),
            favoritePaths: normalizePaths(defaults.favoritePaths),
          };
        } else {
          delete next[scopeKey];
        }
        return { preferencesByScope: next };
      }),
    }),
    { name: 'encaja-navigation-preferences' }
  )
);
