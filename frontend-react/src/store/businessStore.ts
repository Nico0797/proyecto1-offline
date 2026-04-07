import { create } from 'zustand';
import { Business, BusinessModuleKey, BusinessModuleState } from '../types';
import api from '../services/api';
import { offlineSyncService } from '../services/offlineSyncService';
import { useAccountAccessStore } from './accountAccessStore';

// Helper to get initial active business from localStorage
const getInitialActiveBusiness = (): Business | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('activeBusiness');
    return stored ? JSON.parse(stored) : null;
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

let inFlightBootstrapKey: string | null = null;
let inFlightBootstrapPromise: Promise<void> | null = null;

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
    const nextBusinesses = Array.isArray(businesses) ? businesses : [];
    const resolvedActiveBusiness = activeBusiness ?? nextBusinesses[0] ?? null;
    await offlineSyncService.cacheBusinesses(nextBusinesses);
    if (resolvedActiveBusiness) {
      await offlineSyncService.cacheBusiness(resolvedActiveBusiness);
    }
    persistActiveBusiness(resolvedActiveBusiness);
    set({ businesses: nextBusinesses, activeBusiness: resolvedActiveBusiness, isLoading: false, error: null });
  },
  fetchAuthBootstrap: async (preferredBusinessId) => {
    const token = localStorage.getItem('token');
    if (!token) {
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
        await get().hydrateBootstrap(fetchedBusinesses, fetchedActiveBusiness);
      } catch (error: any) {
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
    if (!token) {
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
      set({ businesses: fetchedBusinesses, activeBusiness: newActiveBusiness, isLoading: false });
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
        set({ businesses: localBusinesses, activeBusiness: newActiveBusiness, isLoading: false, error: null });
        return;
      }

      if (error.response?.status === 401) {
         // Handle unauthorized silently, maybe clear businesses
         persistActiveBusiness(null);
         set({ businesses: [], activeBusiness: null, isLoading: false });
         return;
      }
      set({ error: error.message || 'Failed to fetch businesses', isLoading: false });
    }
  },
  fetchBusinessModules: async (businessId: number) => {
    const response = await api.get(`/businesses/${businessId}/modules`);
    const modules: BusinessModuleState[] = response.data.modules || [];

    get().setBusinessModules(businessId, modules);
    return modules;
  },
  updateBusinessModules: async (businessId: number, modules) => {
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
      }));

      if (nextState.activeBusiness?.id === businessId) {
        persistActiveBusiness(nextState.activeBusiness);
      }

      return nextState;
    });
  },
  setActiveBusiness: (business: Business) => {
    set({ activeBusiness: business, error: null });
    persistActiveBusiness(business);
  },
  addBusiness: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/businesses', data);
      const newBusiness = response.data.business;
      
      set((state) => ({
        businesses: [...state.businesses, newBusiness],
        activeBusiness: newBusiness, // Automatically set as active
      }));
      
      persistActiveBusiness(newBusiness);
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
      const response = await api.put(`/businesses/${id}`, data);
      const updatedBusiness = response.data.business;
      await offlineSyncService.cacheBusiness(updatedBusiness);
      
      set((state) => ({
        businesses: state.businesses.map((b) => (b.id === id ? updatedBusiness : b)),
        activeBusiness: state.activeBusiness?.id === id ? updatedBusiness : state.activeBusiness,
      }));
      
      if (get().activeBusiness?.id === id) {
        persistActiveBusiness(updatedBusiness);
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update business' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
