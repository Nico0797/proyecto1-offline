import { create } from 'zustand';
import { AuthState, User, ActiveContext, AccessibleContext } from '../types';
import { resolveApiBaseUrl } from '../services/apiBase';
import { useBusinessStore } from './businessStore';
import { useAccountAccessStore } from './accountAccessStore';
import { resetDemoPreviewSimulation } from '../services/demoPreviewSimulation';
import { getOfflineSessionSeed, hasOfflineSessionSeed, restoreOfflineSession, restoreOfflineSessionSafely } from '../services/offlineSession';
import { pushBootTrace } from '../debug/bootTrace';
import { getRuntimeModeSnapshot, isOfflineProductMode } from '../runtime/runtimeMode';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';
const ACTIVE_CONTEXT_STORAGE_KEY = 'activeContext';
const ACCESSIBLE_CONTEXTS_STORAGE_KEY = 'accessibleContexts';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const ACCOUNT_ACCESS_STORAGE_KEY = 'account_access_snapshot';

let inFlightFetchUserPromise: Promise<void> | null = null;

const hasPersistedSession = () => Boolean(
  localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || hasOfflineSessionSeed()
);

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

export const clearDerivedSessionArtifacts = () => {
  useBusinessStore.getState().reset();
  useAccountAccessStore.getState().clear();
};

export const syncAuthToken = (token: string | null) => {
  persistSessionSnapshot({
    user: readJsonStorage<User | null>(USER_STORAGE_KEY, null),
    token,
  });

  useAuthStore.setState((state) => ({
    ...state,
    token,
    isAuthenticated: Boolean(token || localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || hasOfflineSessionSeed()),
    isHydrating: false,
  }));
};

export const resetAuthSessionState = () => {
  clearDerivedSessionArtifacts();
  clearPersistedAuthSession();
  useAuthStore.setState({
    user: null,
    token: null,
    activeContext: null,
    accessibleContexts: [],
    isAuthenticated: false,
    isHydrating: false,
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
  user: readJsonStorage<User | null>(USER_STORAGE_KEY, getOfflineSessionSeed().user),
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  activeContext: readJsonStorage<ActiveContext | null>(ACTIVE_CONTEXT_STORAGE_KEY, getOfflineSessionSeed().activeContext),
  accessibleContexts: readJsonStorage<AccessibleContext[]>(ACCESSIBLE_CONTEXTS_STORAGE_KEY, getOfflineSessionSeed().accessibleContexts),
  isAuthenticated: hasPersistedSession(),
  isHydrating: hasPersistedSession(),
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
      isHydrating: false,
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

    resetAuthSessionState();
  },
  fetchUser: async () => {
    if (inFlightFetchUserPromise) {
      return inFlightFetchUserPromise;
    }

    const runFetchUser = async () => {
      set((state) => ({
        ...state,
        isHydrating: true,
        isAuthenticated: hasPersistedSession(),
      }));

      pushBootTrace('authStore.fetchUser.start', {
        hasPersistedSession: hasPersistedSession(),
        hasOfflineSeed: hasOfflineSessionSeed(),
        hasToken: Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
        hasRefreshToken: Boolean(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)),
      });

      console.info('[startup][authStore] fetchUser:start', {
        runtime: getRuntimeModeSnapshot(),
        hasPersistedSession: hasPersistedSession(),
        hasOfflineSeed: hasOfflineSessionSeed(),
        hasToken: Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
        hasRefreshToken: Boolean(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)),
      });

      try {
        if (isOfflineProductMode()) {
          const offlineSession = await restoreOfflineSessionSafely(undefined, 2500);

          if (offlineSession) {
            persistSessionSnapshot({
              user: offlineSession.user,
              token: null,
              activeContext: offlineSession.activeContext,
              accessibleContexts: offlineSession.accessibleContexts,
            });
            set({
              user: offlineSession.user,
              token: null,
              activeContext: offlineSession.activeContext,
              accessibleContexts: offlineSession.accessibleContexts,
              isAuthenticated: Boolean(offlineSession.activeBusiness),
              isHydrating: false,
            });
            pushBootTrace('authStore.fetchUser.offlineResolved', {
              activeBusinessId: offlineSession.activeBusiness?.id ?? null,
              activeContextBusinessId: offlineSession.activeContext?.business_id ?? null,
              accessibleContextsCount: offlineSession.accessibleContexts.length,
            });
            console.info('[startup][authStore] fetchUser:offline-resolved', {
              runtime: getRuntimeModeSnapshot(),
              hasActiveBusiness: Boolean(offlineSession.activeBusiness),
              activeBusinessId: offlineSession.activeBusiness?.id ?? null,
            });
            return;
          }

          set({
            user: null,
            token: null,
            activeContext: null,
            accessibleContexts: [],
            isAuthenticated: false,
            isHydrating: false,
          });
          pushBootTrace('authStore.fetchUser.offlineEmpty', {});
          console.info('[startup][authStore] fetchUser:offline-empty', {
            runtime: getRuntimeModeSnapshot(),
          });
          return;
        }

        let token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const apiBaseUrl = resolveApiBaseUrl();

        if (!token && localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
          token = await requestTokenRefresh();
        }

        if (!token) {
          if (hasOfflineSessionSeed()) {
            const offlineSession = await restoreOfflineSession();
            if (offlineSession) {
              persistSessionSnapshot({
                user: offlineSession.user,
                token: null,
                activeContext: offlineSession.activeContext,
                accessibleContexts: offlineSession.accessibleContexts,
              });
              set({
                user: offlineSession.user,
                token: null,
                activeContext: offlineSession.activeContext,
                accessibleContexts: offlineSession.accessibleContexts,
                isAuthenticated: true,
                isHydrating: false,
              });
              pushBootTrace('authStore.fetchUser.seedResolved', {
                activeBusinessId: offlineSession.activeBusiness?.id ?? null,
                activeContextBusinessId: offlineSession.activeContext?.business_id ?? null,
              });
              return;
            }
          }
          resetAuthSessionState();
          return;
        }

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
            resetAuthSessionState();
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
          useAccountAccessStore.getState().setAccess(data.account_access || null);

          persistSessionSnapshot({
            user: userData,
            token,
          });
          set({ user: userData, token, isAuthenticated: Boolean(token), isHydrating: false });
          pushBootTrace('authStore.fetchUser.remoteResolved', {
            userId: userData?.id ?? null,
            hasToken: Boolean(token),
          });
          console.info('[startup][authStore] fetchUser:remote-resolved', {
            runtime: getRuntimeModeSnapshot(),
            userId: userData?.id ?? null,
          });
          return;
        }

        if (res.status === 401) {
          resetAuthSessionState();
        } else {
          set((state) => ({
            ...state,
            isHydrating: false,
          }));
        }
      } catch (e) {
        console.error('[startup][authStore] fetchUser:error', {
          runtime: getRuntimeModeSnapshot(),
          error: e,
        });
        pushBootTrace('authStore.fetchUser.error', {
          message: e instanceof Error ? e.message : String(e),
        });
        const refreshStatus = (e as { status?: number })?.status;
        if (hasOfflineSessionSeed()) {
          const offlineSession = await restoreOfflineSessionSafely(undefined, 2500);
          if (offlineSession) {
            persistSessionSnapshot({
              user: offlineSession.user,
              token: null,
              activeContext: offlineSession.activeContext,
              accessibleContexts: offlineSession.accessibleContexts,
            });
            set({
              user: offlineSession.user,
              token: null,
              activeContext: offlineSession.activeContext,
              accessibleContexts: offlineSession.accessibleContexts,
              isAuthenticated: true,
              isHydrating: false,
            });
            pushBootTrace('authStore.fetchUser.errorRecoveredOffline', {
              activeBusinessId: offlineSession.activeBusiness?.id ?? null,
              activeContextBusinessId: offlineSession.activeContext?.business_id ?? null,
            });
            return;
          }
        }
        if (refreshStatus === 401 || !localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
          resetAuthSessionState();
          return;
        }

        set((state) => ({
          ...state,
          isHydrating: false,
        }));
      }
    };

    inFlightFetchUserPromise = runFetchUser().finally(() => {
      inFlightFetchUserPromise = null;
    });

    return inFlightFetchUserPromise;
  },
}));
