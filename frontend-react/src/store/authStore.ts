import { create } from 'zustand';
import { AuthState, User, ActiveContext, AccessibleContext } from '../types';
import { resolveApiBaseUrl } from '../services/apiBase';
import { useBusinessStore } from './businessStore';
import { resetDemoPreviewSimulation } from '../services/demoPreviewSimulation';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';
const ACTIVE_CONTEXT_STORAGE_KEY = 'activeContext';
const ACCESSIBLE_CONTEXTS_STORAGE_KEY = 'accessibleContexts';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const ACCOUNT_ACCESS_STORAGE_KEY = 'account_access_snapshot';

const readJsonStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const persistSessionSnapshot = ({
  user,
  token,
  activeContext,
  accessibleContexts,
}: {
  user: User | null;
  token: string | null;
  activeContext?: ActiveContext | null;
  accessibleContexts?: AccessibleContext[];
}) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  if (activeContext !== undefined) {
    if (activeContext) {
      localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, JSON.stringify(activeContext));
    } else {
      localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
    }
  }

  if (accessibleContexts !== undefined) {
    localStorage.setItem(ACCESSIBLE_CONTEXTS_STORAGE_KEY, JSON.stringify(accessibleContexts));
  }
};

export const clearPersistedAuthSession = () => {
  resetDemoPreviewSimulation();
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
  localStorage.removeItem(ACCESSIBLE_CONTEXTS_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_ACCESS_STORAGE_KEY);
};

export const syncAuthToken = (token: string | null) => {
  persistSessionSnapshot({
    user: readJsonStorage<User | null>(USER_STORAGE_KEY, null),
    token,
  });

  useAuthStore.setState((state) => ({
    ...state,
    token,
    isAuthenticated: Boolean(token),
  }));
};

const clearAuthState = () => {
  useBusinessStore.getState().reset();
  clearPersistedAuthSession();
  useAuthStore.setState({
    user: null,
    token: null,
    activeContext: null,
    accessibleContexts: [],
    isAuthenticated: false,
  });
};

const requestTokenRefresh = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) return null;

  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: apiBaseUrl.startsWith('/') ? 'include' : 'same-origin',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = new Error('Refresh token inválido') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const nextToken = data?.access_token || null;
  if (!nextToken) {
    throw new Error('Access token no recibido');
  }

  syncAuthToken(nextToken);
  return nextToken;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: readJsonStorage<User | null>(USER_STORAGE_KEY, null),
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  activeContext: readJsonStorage<ActiveContext | null>(ACTIVE_CONTEXT_STORAGE_KEY, null),
  accessibleContexts: readJsonStorage<AccessibleContext[]>(ACCESSIBLE_CONTEXTS_STORAGE_KEY, []),
  isAuthenticated: !!localStorage.getItem(TOKEN_STORAGE_KEY),
  login: (user: User, token: string, activeContext?: ActiveContext | null, accessibleContexts?: AccessibleContext[]) => {
    useBusinessStore.getState().reset();
    persistSessionSnapshot({
      user,
      token,
      activeContext: activeContext ?? null,
      accessibleContexts: accessibleContexts ?? [],
    });

    set({
      user,
      token,
      activeContext: activeContext || null,
      accessibleContexts: accessibleContexts || [],
      isAuthenticated: true,
    });
  },
  selectContext: (context: ActiveContext) => {
    persistSessionSnapshot({
      user: readJsonStorage<User | null>(USER_STORAGE_KEY, null),
      token: localStorage.getItem(TOKEN_STORAGE_KEY),
      activeContext: context,
    });
    set({ activeContext: context });
  },
  logout: () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      const apiBaseUrl = resolveApiBaseUrl();
      void fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: apiBaseUrl.startsWith('/') ? 'include' : 'same-origin',
      }).catch(() => undefined);
    }

    clearAuthState();
  },
  fetchUser: async () => {
    try {
      let token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const apiBaseUrl = resolveApiBaseUrl();

      if (!token && localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
        token = await requestTokenRefresh();
      }

      if (!token) return;

      let res = await fetch(`${apiBaseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: apiBaseUrl.startsWith('/') ? 'include' : 'same-origin',
      });

      if (res.status === 401 && localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
        token = await requestTokenRefresh();
        if (!token) {
          clearAuthState();
          return;
        }

        res = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: apiBaseUrl.startsWith('/') ? 'include' : 'same-origin',
        });
      }

      if (res.ok) {
        const data = await res.json();
        const userData = data.user || data;

        persistSessionSnapshot({
          user: userData,
          token,
        });
        set({ user: userData, token, isAuthenticated: Boolean(token) });
        return;
      }

      if (res.status === 401) {
        clearAuthState();
      }
    } catch (e) {
      console.error('Failed to refresh user data', e);
      const refreshStatus = (e as { status?: number })?.status;
      if (refreshStatus === 401 || !localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
        clearAuthState();
      }
    }
  },
}));
