import { create } from 'zustand';
import {
  BUSINESS_MODULE_META,
  BUSINESS_MODULE_ORDER,
  Business,
  BusinessModuleKey,
  BusinessModuleState,
} from '../types';
import api from '../services/api';
import { offlineSyncService } from '../services/offlineSyncService';
import { useAccountAccessStore } from './accountAccessStore';
import { pushBootTrace } from '../debug/bootTrace';
import {
  buildDesktopOfflineUser,
  hasOfflineSessionSeed,
  normalizeOfflineBusinessRecord,
  persistOfflineSessionSnapshot,
  restoreOfflineSession,
  restoreOfflineSessionSafely,
} from '../services/offlineSession';
import { getRuntimeModeSnapshot, isOfflineProductMode } from '../runtime/runtimeMode';

// Helper to get initial active business from localStorage
const getInitialActiveBusiness = (): Business | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('activeBusiness');
    return stored ? normalizeOfflineBusinessRecord(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

interface BusinessState {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
  hydrateBootstrap: (businesses: Business[], activeBusiness?: Business | null) => Promise<void>;
  fetchAuthBootstrap: (preferredBusinessId?: number | null) => Promise<void>;
  fetchBusinesses: (preferredBusinessId?: number | null) => Promise<void>;
  fetchBusinessModules: (businessId: number) => Promise<BusinessModuleState[]>;
  updateBusinessModules: (businessId: number, modules: Record<BusinessModuleKey, boolean>) => Promise<BusinessModuleState[]>;
  setBusinessModules: (businessId: number, modules: BusinessModuleState[]) => void;
  setActiveBusiness: (business: Business) => void;
  addBusiness: (data: Partial<Business>) => Promise<Business>;
  updateBusiness: (id: number, data: Partial<Business>) => Promise<void>;
  deleteBusiness: (id: number) => Promise<{ businesses: Business[]; activeBusiness: Business | null }>;
}

const persistActiveBusiness = (business: Business | null) => {
  if (typeof window === 'undefined') return;
  if (!business) {
    localStorage.removeItem('activeBusiness');
    return;
  }
  localStorage.setItem('activeBusiness', JSON.stringify(business));
};

const replaceBusinessInState = (state: BusinessState, businessId: number, updater: (business: Business) => Business) => {
  const businesses = state.businesses.map((business) =>
    business.id === businessId ? updater(business) : business
  );

  const activeBusiness =
    state.activeBusiness?.id === businessId
      ? updater(state.activeBusiness)
      : state.activeBusiness;

  return { businesses, activeBusiness };
};

const buildDefaultModules = (): BusinessModuleState[] =>
  BUSINESS_MODULE_ORDER.map((moduleKey) => ({
    module_key: moduleKey,
    enabled: BUSINESS_MODULE_META[moduleKey].defaultEnabled,
    config: null,
    updated_at: new Date().toISOString(),
  }));

let inFlightBootstrapKey: string | null = null;
let inFlightBootstrapPromise: Promise<void> | null = null;

const resolveHydratedActiveBusiness = ({
  businesses,
  explicitActiveBusiness,
  currentActiveBusiness,
  storedActiveBusiness,
}: {
  businesses: Business[];
  explicitActiveBusiness: Business | null;
  currentActiveBusiness: Business | null;
  storedActiveBusiness: Business | null;
}) => {
  const candidateIds = [
    explicitActiveBusiness?.id ?? null,
    currentActiveBusiness?.id ?? null,
    storedActiveBusiness?.id ?? null,
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  for (const id of candidateIds) {
    const match = businesses.find((business) => business.id === id);
    if (match) return match;
  }

  return explicitActiveBusiness ?? currentActiveBusiness ?? storedActiveBusiness ?? businesses[0] ?? null;
};

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  activeBusiness: getInitialActiveBusiness(),
  isLoading: false,
  error: null,
  reset: () => {
    persistActiveBusiness(null);
    set({ businesses: [], activeBusiness: null, isLoading: false, error: null });
  },
  hydrateBootstrap: async (businesses, activeBusiness) => {
    pushBootTrace('businessStore.hydrateBootstrap.start', {
      inputBusinessesCount: Array.isArray(businesses) ? businesses.length : 0,
      inputActiveBusinessId: normalizeOfflineBusinessRecord(activeBusiness)?.id ?? null,
    });
    const nextBusinesses = (Array.isArray(businesses) ? businesses : [])
      .map((business) => normalizeOfflineBusinessRecord(business))
      .filter((business): business is Business => Boolean(business));
    const normalizedActiveBusiness = normalizeOfflineBusinessRecord(activeBusiness);
    const resolvedActiveBusiness = resolveHydratedActiveBusiness({
      businesses: nextBusinesses,
      explicitActiveBusiness: normalizedActiveBusiness,
      currentActiveBusiness: normalizeOfflineBusinessRecord(get().activeBusiness),
      storedActiveBusiness: getInitialActiveBusiness(),
    });
    persistActiveBusiness(resolvedActiveBusiness);
    persistOfflineSessionSnapshot({
      businesses: nextBusinesses,
      activeBusiness: resolvedActiveBusiness,
    });
    console.info('[startup][businessStore] hydrateBootstrap', {
      runtime: getRuntimeModeSnapshot(),
      businessesCount: nextBusinesses.length,
      activeBusinessId: resolvedActiveBusiness?.id ?? null,
      hasActiveBusiness: Boolean(resolvedActiveBusiness),
    });
    set({ businesses: nextBusinesses, activeBusiness: resolvedActiveBusiness, isLoading: false, error: null });
    pushBootTrace('businessStore.hydrateBootstrap.resolved', {
      businessesCount: nextBusinesses.length,
      activeBusinessId: resolvedActiveBusiness?.id ?? null,
    });

    void Promise.allSettled([
      offlineSyncService.cacheBusinesses(nextBusinesses),
      resolvedActiveBusiness ? offlineSyncService.cacheBusiness(resolvedActiveBusiness) : Promise.resolve(),
    ]).then((results) => {
      const rejected = results.find((result) => result.status === 'rejected');
      if (rejected) {
        console.error('[startup][businessStore] hydrateBootstrap:cache-persist-failed', {
          runtime: getRuntimeModeSnapshot(),
          error: rejected.reason,
          activeBusinessId: resolvedActiveBusiness?.id ?? null,
        });
      }
    });
  },
  fetchAuthBootstrap: async (preferredBusinessId) => {
    const token = localStorage.getItem('token');
    const offlineProductMode = isOfflineProductMode();
    pushBootTrace('businessStore.fetchAuthBootstrap.start', {
      preferredBusinessId: preferredBusinessId ?? null,
      hasToken: Boolean(token),
      hasOfflineSeed: hasOfflineSessionSeed(),
      offlineProductMode,
      storedActiveBusinessId: get().activeBusiness?.id ?? null,
    });
    console.info('[startup][businessStore] fetchAuthBootstrap:start', {
      runtime: getRuntimeModeSnapshot(),
      preferredBusinessId: preferredBusinessId ?? null,
      hasToken: Boolean(token),
      hasOfflineSeed: hasOfflineSessionSeed(),
      offlineProductMode,
      storedActiveBusinessId: get().activeBusiness?.id ?? null,
    });
    if (!token && offlineProductMode) {
      try {
        const offlineSession = await restoreOfflineSessionSafely(preferredBusinessId, 2500);
        if (offlineSession) {
          console.info('[startup][businessStore] fetchAuthBootstrap:offline-product-resolved', {
            businessesCount: offlineSession.businesses.length,
            activeBusinessId: offlineSession.activeBusiness?.id ?? null,
          });
          pushBootTrace('businessStore.fetchAuthBootstrap.offlineResolved', {
            businessesCount: offlineSession.businesses.length,
            activeBusinessId: offlineSession.activeBusiness?.id ?? null,
          });
          await get().hydrateBootstrap(offlineSession.businesses, offlineSession.activeBusiness);
          return;
        }
      } catch (error) {
        console.error('[startup][businessStore] fetchAuthBootstrap:offline-product-error', {
          runtime: getRuntimeModeSnapshot(),
          error,
        });
        pushBootTrace('businessStore.fetchAuthBootstrap.offlineError', {
          message: error instanceof Error ? error.message : String(error),
        });
      }

      console.info('[startup][businessStore] fetchAuthBootstrap:offline-product-empty', {
        runtime: getRuntimeModeSnapshot(),
      });
      persistActiveBusiness(null);
      set({ businesses: [], activeBusiness: null, isLoading: false, error: null });
      return;
    }

    if (!token) {
      if (hasOfflineSessionSeed()) {
        const offlineSession = await restoreOfflineSession(preferredBusinessId);
        if (offlineSession) {
          console.info('[startup][businessStore] fetchAuthBootstrap:offline-session', {
            businessesCount: offlineSession.businesses.length,
            activeBusinessId: offlineSession.activeBusiness?.id ?? null,
          });
          pushBootTrace('businessStore.fetchAuthBootstrap.seedResolved', {
            businessesCount: offlineSession.businesses.length,
            activeBusinessId: offlineSession.activeBusiness?.id ?? null,
          });
          await get().hydrateBootstrap(offlineSession.businesses, offlineSession.activeBusiness);
          return;
        }
      }
      console.info('[startup][businessStore] fetchAuthBootstrap:empty-offline-session', {
        runtime: getRuntimeModeSnapshot(),
      });
      persistActiveBusiness(null);
      set({ businesses: [], activeBusiness: null, isLoading: false });
      return;
    }

    const requestKey = String(preferredBusinessId ?? 'default');
    if (inFlightBootstrapPromise && inFlightBootstrapKey === requestKey) {
      await inFlightBootstrapPromise;
      return;
    }

    const runBootstrap = async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.get('/auth/bootstrap', {
          params: preferredBusinessId != null ? { business_id: preferredBusinessId } : undefined,
        });
        const fetchedBusinesses = response.data.businesses || [];
        const fetchedActiveBusiness = response.data.active_business || null;
        useAccountAccessStore.getState().setAccess(response.data.account_access || null);
        pushBootTrace('businessStore.fetchAuthBootstrap.remoteResolved', {
          businessesCount: fetchedBusinesses.length,
          activeBusinessId: fetchedActiveBusiness?.id ?? null,
        });
        await get().hydrateBootstrap(fetchedBusinesses, fetchedActiveBusiness);
      } catch (error: any) {
        pushBootTrace('businessStore.fetchAuthBootstrap.error', {
          message: error?.message || 'unknown-error',
          status: error?.response?.status ?? null,
        });
        if (error?.response?.status === 401) {
          persistActiveBusiness(null);
          set({ businesses: [], activeBusiness: null, isLoading: false });
          return;
        }
        await get().fetchBusinesses(preferredBusinessId);
      }
    };

    inFlightBootstrapKey = requestKey;
    inFlightBootstrapPromise = runBootstrap();

    try {
      await inFlightBootstrapPromise;
    } finally {
      if (inFlightBootstrapKey === requestKey) {
        inFlightBootstrapKey = null;
        inFlightBootstrapPromise = null;
      }
    }
  },
  fetchBusinesses: async (preferredBusinessId) => {
    // Avoid fetching if no token is present to prevent 401s
    const token = localStorage.getItem('token');
    pushBootTrace('businessStore.fetchBusinesses.start', {
      preferredBusinessId: preferredBusinessId ?? null,
      hasToken: Boolean(token),
      offlineProductMode: isOfflineProductMode(),
      currentActiveBusinessId: get().activeBusiness?.id ?? null,
      currentBusinessesCount: get().businesses.length,
    });
    if (!token && isOfflineProductMode()) {
      try {
        const offlineSession = await restoreOfflineSessionSafely(preferredBusinessId, 2500);
        if (offlineSession) {
          persistActiveBusiness(offlineSession.activeBusiness);
          set({
            businesses: offlineSession.businesses,
            activeBusiness: offlineSession.activeBusiness,
            isLoading: false,
            error: null,
          });
          pushBootTrace('businessStore.fetchBusinesses.offlineResolved', {
            businessesCount: offlineSession.businesses.length,
            activeBusinessId: offlineSession.activeBusiness?.id ?? null,
          });
          return;
        }
      } catch (error) {
        console.error('[startup][businessStore] fetchBusinesses:offline-product-error', {
          runtime: getRuntimeModeSnapshot(),
          error,
        });
        pushBootTrace('businessStore.fetchBusinesses.offlineError', {
          message: error instanceof Error ? error.message : String(error),
        });
      }

      persistActiveBusiness(null);
      set({ businesses: [], activeBusiness: null, isLoading: false, error: null });
      return;
    }

    if (!token) {
      if (hasOfflineSessionSeed()) {
        const offlineSession = await restoreOfflineSession(preferredBusinessId);
        if (offlineSession) {
          persistActiveBusiness(offlineSession.activeBusiness);
          set({
            businesses: offlineSession.businesses,
            activeBusiness: offlineSession.activeBusiness,
            isLoading: false,
            error: null,
          });
          pushBootTrace('businessStore.fetchBusinesses.seedResolved', {
            businessesCount: offlineSession.businesses.length,
            activeBusinessId: offlineSession.activeBusiness?.id ?? null,
          });
          return;
        }
      }
      persistActiveBusiness(null);
      set({ businesses: [], activeBusiness: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/businesses', {
        params: preferredBusinessId != null ? { preferred_business_id: preferredBusinessId } : undefined,
      });
      const fetchedBusinesses = response.data.businesses;
      await offlineSyncService.cacheBusinesses(fetchedBusinesses);
      
      const { activeBusiness } = get();
      const activeBusinessId = activeBusiness?.id ?? null;
      const resolvedPreferredBusiness = preferredBusinessId != null
        ? fetchedBusinesses.find((business: Business) => business.id === preferredBusinessId) ?? null
        : null;
      const resolvedStoredBusiness = activeBusinessId != null
        ? fetchedBusinesses.find((business: Business) => business.id === activeBusinessId) ?? null
        : null;

      let newActiveBusiness = resolvedPreferredBusiness ?? resolvedStoredBusiness ?? null;

      if (!newActiveBusiness && fetchedBusinesses.length > 0) {
        newActiveBusiness = fetchedBusinesses[0];
      }
      
      persistActiveBusiness(newActiveBusiness);
      persistOfflineSessionSnapshot({
        businesses: fetchedBusinesses,
        activeBusiness: newActiveBusiness,
      });
      set({ businesses: fetchedBusinesses, activeBusiness: newActiveBusiness, isLoading: false });
      pushBootTrace('businessStore.fetchBusinesses.remoteResolved', {
        businessesCount: fetchedBusinesses.length,
        activeBusinessId: newActiveBusiness?.id ?? null,
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const localBusinesses = await offlineSyncService.getBusinessesFromLocal();
        const resolvedPreferredBusiness = preferredBusinessId != null
          ? localBusinesses.find((business: Business) => business.id === preferredBusinessId) ?? null
          : null;
        const currentActiveBusinessId = get().activeBusiness?.id ?? null;
        const resolvedStoredBusiness = currentActiveBusinessId != null
          ? localBusinesses.find((business: Business) => business.id === currentActiveBusinessId) ?? null
          : null;
        const newActiveBusiness = resolvedPreferredBusiness ?? resolvedStoredBusiness ?? localBusinesses[0] ?? null;

        persistActiveBusiness(newActiveBusiness);
        persistOfflineSessionSnapshot({
          businesses: localBusinesses,
          activeBusiness: newActiveBusiness,
        });
        set({ businesses: localBusinesses, activeBusiness: newActiveBusiness, isLoading: false, error: null });
        pushBootTrace('businessStore.fetchBusinesses.localFallbackResolved', {
          businessesCount: localBusinesses.length,
          activeBusinessId: newActiveBusiness?.id ?? null,
        });
        return;
      }

      if (error.response?.status === 401) {
         // Handle unauthorized silently, maybe clear businesses
         persistActiveBusiness(null);
         set({ businesses: [], activeBusiness: null, isLoading: false });
         return;
      }
      pushBootTrace('businessStore.fetchBusinesses.error', {
        message: error?.message || 'Failed to fetch businesses',
        status: error?.response?.status ?? null,
      });
      set({ error: error.message || 'Failed to fetch businesses', isLoading: false });
    }
  },
  fetchBusinessModules: async (businessId: number) => {
    const token = localStorage.getItem('token');
    if (!token && isOfflineProductMode()) {
      const business = get().businesses.find((candidate) => candidate.id === businessId) ?? get().activeBusiness;
      return business?.modules || buildDefaultModules();
    }

    const response = await api.get(`/businesses/${businessId}/modules`);
    const modules: BusinessModuleState[] = response.data.modules || [];

    get().setBusinessModules(businessId, modules);
    return modules;
  },
  updateBusinessModules: async (businessId: number, modules) => {
    const token = localStorage.getItem('token');
    if (!token && isOfflineProductMode()) {
      const updatedModules: BusinessModuleState[] = BUSINESS_MODULE_ORDER.map((moduleKey) => ({
        module_key: moduleKey,
        enabled: Boolean(modules[moduleKey]),
        config: null,
        updated_at: new Date().toISOString(),
      }));

      get().setBusinessModules(businessId, updatedModules);
      return updatedModules;
    }

    const response = await api.put(`/businesses/${businessId}/modules`, { modules });
    const updatedModules: BusinessModuleState[] = response.data.modules || [];

    get().setBusinessModules(businessId, updatedModules);
    return updatedModules;
  },
  setBusinessModules: (businessId: number, modules: BusinessModuleState[]) => {
    set((state) => {
      const nextState = replaceBusinessInState(state, businessId, (business) => ({
        ...business,
        modules,
        sync_status: 'pending',
        is_offline_record: true,
      }));

      if (nextState.activeBusiness?.id === businessId) {
        persistActiveBusiness(nextState.activeBusiness);
      }

       void offlineSyncService.cacheBusinesses(nextState.businesses);
       if (nextState.activeBusiness) {
         void offlineSyncService.cacheBusiness(nextState.activeBusiness);
       }
       persistOfflineSessionSnapshot({
         businesses: nextState.businesses,
         activeBusiness: nextState.activeBusiness,
       });

      return nextState;
    });
  },
  setActiveBusiness: (business: Business) => {
    set({ activeBusiness: business, error: null });
    persistActiveBusiness(business);
    persistOfflineSessionSnapshot({
      businesses: get().businesses,
      activeBusiness: business,
    });
  },
  addBusiness: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token && isOfflineProductMode()) {
        const owner = buildDesktopOfflineUser();
        const newBusiness: Business = {
          id: Date.now(),
          user_id: owner.id,
          name: String(data.name || '').trim(),
          currency: String(data.currency || 'COP'),
          created_at: new Date().toISOString(),
          settings: data.settings || null,
          role: 'owner',
          permissions: [],
          permissions_canonical: [],
          plan: 'business',
          modules: buildDefaultModules(),
          sync_status: 'pending',
          is_offline_record: true,
          client_operation_id: `business_${Date.now()}`,
        };

        const nextBusinesses = [...get().businesses, newBusiness];
        persistActiveBusiness(newBusiness);
        persistOfflineSessionSnapshot({ businesses: nextBusinesses, activeBusiness: newBusiness });
        await offlineSyncService.cacheBusinesses(nextBusinesses);
        await offlineSyncService.cacheBusiness(newBusiness);
        console.info('[startup][businessStore] addBusiness:offline', {
          runtime: getRuntimeModeSnapshot(),
          newBusinessId: newBusiness.id,
          businessesCount: nextBusinesses.length,
        });

        set({
          businesses: nextBusinesses,
          activeBusiness: newBusiness,
          isLoading: false,
          error: null,
        });

        return newBusiness;
      }

      const response = await api.post('/businesses', data);
      const newBusiness = response.data.business;
      
      const nextBusinesses = [...get().businesses, newBusiness];
      set({
        businesses: nextBusinesses,
        activeBusiness: newBusiness,
      });
      
      persistActiveBusiness(newBusiness);
      persistOfflineSessionSnapshot({
        businesses: nextBusinesses,
        activeBusiness: newBusiness,
      });
      await offlineSyncService.cacheBusiness(newBusiness);
      return newBusiness;
    } catch (error: any) {
      set({ error: error.message || 'Failed to add business' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateBusiness: async (id: number, data: Partial<Business>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token && isOfflineProductMode()) {
        const currentBusiness = get().businesses.find((business) => business.id === id);
        if (!currentBusiness) {
          throw new Error('No se encontro el negocio local para actualizar');
        }

        const updatedBusiness: Business = {
          ...currentBusiness,
          ...data,
          settings: data.settings === undefined ? currentBusiness.settings : data.settings,
          sync_status: 'pending',
          is_offline_record: true,
        };

        const nextBusinesses = get().businesses.map((business) => (business.id === id ? updatedBusiness : business));
        const nextActiveBusiness = get().activeBusiness?.id === id ? updatedBusiness : get().activeBusiness;

        await offlineSyncService.cacheBusinesses(nextBusinesses);
        await offlineSyncService.cacheBusiness(updatedBusiness);
        persistOfflineSessionSnapshot({
          businesses: nextBusinesses,
          activeBusiness: nextActiveBusiness,
        });

        set({
          businesses: nextBusinesses,
          activeBusiness: nextActiveBusiness,
          isLoading: false,
          error: null,
        });

        if (nextActiveBusiness?.id === id) {
          persistActiveBusiness(updatedBusiness);
        }
        return;
      }

      const response = await api.put(`/businesses/${id}`, data);
      const updatedBusiness = response.data.business;
      await offlineSyncService.cacheBusiness(updatedBusiness);
      const nextBusinesses = get().businesses.map((business) => (business.id === id ? updatedBusiness : business));
      const nextActiveBusiness = get().activeBusiness?.id === id ? updatedBusiness : get().activeBusiness;
      
      set({
        businesses: nextBusinesses,
        activeBusiness: nextActiveBusiness,
      });
      
      if (nextActiveBusiness?.id === id) {
        persistActiveBusiness(updatedBusiness);
      }
      persistOfflineSessionSnapshot({
        businesses: nextBusinesses,
        activeBusiness: nextActiveBusiness,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update business' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteBusiness: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const activeBusiness = get().activeBusiness;
      const currentBusinesses =
        activeBusiness && !get().businesses.some((business) => business.id === activeBusiness.id)
          ? [...get().businesses, activeBusiness]
          : get().businesses;
      const businessToDelete = currentBusinesses.find((business) => business.id === id);

      if (!businessToDelete) {
        throw new Error('No se encontro el negocio para eliminar');
      }

      if (token && !isOfflineProductMode()) {
        await api.delete(`/businesses/${id}`);
      }

      const nextBusinesses = currentBusinesses.filter((business) => business.id !== id);
      const nextActiveBusiness =
        activeBusiness?.id === id
          ? nextBusinesses[0] ?? null
          : activeBusiness;

      await offlineSyncService.deleteLocalBusiness(id);
      await offlineSyncService.cacheBusinesses(nextBusinesses);
      if (nextActiveBusiness) {
        await offlineSyncService.cacheBusiness(nextActiveBusiness);
      }

      persistActiveBusiness(nextActiveBusiness);
      persistOfflineSessionSnapshot({
        businesses: nextBusinesses,
        activeBusiness: nextActiveBusiness,
      });

      set({
        businesses: nextBusinesses,
        activeBusiness: nextActiveBusiness,
        isLoading: false,
        error: null,
      });

      return { businesses: nextBusinesses, activeBusiness: nextActiveBusiness };
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete business' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
