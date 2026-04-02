import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { accountAccessService, type AccountAccessStatePayload } from '../services/accountAccessService';
import type { Pricing } from '../services/membershipService';
import { resetDemoPreviewSimulation } from '../services/demoPreviewSimulation';

const ACCOUNT_ACCESS_STORAGE_KEY = 'account_access_snapshot';

const readStoredAccess = (): AccountAccessStatePayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_ACCESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AccountAccessStatePayload : null;
  } catch {
    return null;
  }
};

const persistAccess = (access: AccountAccessStatePayload | null) => {
  if (typeof window === 'undefined') return;
  if (!access) {
    localStorage.removeItem(ACCOUNT_ACCESS_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ACCOUNT_ACCESS_STORAGE_KEY, JSON.stringify(access));
};

interface AccountAccessStoreState {
  access: AccountAccessStatePayload | null;
  pricing: Pricing | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  clear: () => void;
  setAccess: (access: AccountAccessStatePayload | null, pricing?: Pricing | null) => void;
  fetchStatus: () => Promise<AccountAccessStatePayload | null>;
  startPreview: () => Promise<AccountAccessStatePayload | null>;
  stopPreview: () => Promise<AccountAccessStatePayload | null>;
}

const syncResolvedPlanToUser = (access: AccountAccessStatePayload | null) => {
  if (!access?.plan) return;
  const resolvedPlan = access.plan;

  useAuthStore.setState((state) => {
    if (!state.user || state.user.plan === resolvedPlan) return state;
    const nextUser = { ...state.user, plan: resolvedPlan };
    localStorage.setItem('user', JSON.stringify(nextUser));
    return { ...state, user: nextUser };
  });
};

const syncPreviewSimulationLifecycle = (
  previousAccess: AccountAccessStatePayload | null,
  nextAccess: AccountAccessStatePayload | null
) => {
  const wasPreview = Boolean(previousAccess?.demo_preview_active);
  const isPreview = Boolean(nextAccess?.demo_preview_active);

  if (!wasPreview && isPreview) {
    resetDemoPreviewSimulation();
    return;
  }

  if (wasPreview && !isPreview) {
    resetDemoPreviewSimulation();
  }
};

export const useAccountAccessStore = create<AccountAccessStoreState>((set) => ({
  access: readStoredAccess(),
  pricing: null,
  isLoading: false,
  hasLoaded: Boolean(readStoredAccess()),
  error: null,
  clear: () => {
    syncPreviewSimulationLifecycle(readStoredAccess(), null);
    persistAccess(null);
    set({ access: null, pricing: null, isLoading: false, hasLoaded: false, error: null });
  },
  setAccess: (access, pricing) => {
    syncPreviewSimulationLifecycle(readStoredAccess(), access);
    syncResolvedPlanToUser(access);
    persistAccess(access);
    set((state) => ({
      access,
      pricing: pricing === undefined ? state.pricing : pricing,
      isLoading: false,
      hasLoaded: true,
      error: null,
    }));
  },
  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await accountAccessService.getStatus();
      syncPreviewSimulationLifecycle(readStoredAccess(), response.account_access || null);
      syncResolvedPlanToUser(response.account_access || null);
      persistAccess(response.account_access || null);
      set({
        access: response.account_access || null,
        pricing: response.pricing || null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
      return response.account_access || null;
    } catch (error: any) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: error?.response?.data?.error || error?.message || 'No se pudo resolver el acceso inicial',
      });
      throw error;
    }
  },
  startPreview: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await accountAccessService.startPreview();
      syncPreviewSimulationLifecycle(readStoredAccess(), response.account_access || null);
      syncResolvedPlanToUser(response.account_access || null);
      persistAccess(response.account_access || null);
      set({
        access: response.account_access || null,
        pricing: response.pricing || null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
      return response.account_access || null;
    } catch (error: any) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: error?.response?.data?.error || error?.message || 'No se pudo iniciar la vista previa',
      });
      throw error;
    }
  },
  stopPreview: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await accountAccessService.stopPreview();
      syncPreviewSimulationLifecycle(readStoredAccess(), response.account_access || null);
      syncResolvedPlanToUser(response.account_access || null);
      persistAccess(response.account_access || null);
      set({
        access: response.account_access || null,
        pricing: response.pricing || null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
      return response.account_access || null;
    } catch (error: any) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: error?.response?.data?.error || error?.message || 'No se pudo cerrar la vista previa',
      });
      throw error;
    }
  },
}));
