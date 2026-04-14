import { create } from 'zustand';
import { TreasuryAccount, TreasuryAccountsSummary, TreasuryMovement } from '../types';
import { treasuryService, TreasuryAccountPayload, TreasuryMovementFilters } from '../services/treasuryService';
import { offlineSyncService } from '../services/offlineSyncService';
import { sortTreasuryAccounts } from '../utils/treasury';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';
import { isPureOfflineRuntime } from '../services/offlineLocalData';

interface TreasuryState {
  businessId: number | null;
  accounts: TreasuryAccount[];
  accountsSummary: TreasuryAccountsSummary | null;
  movements: TreasuryMovement[];
  loadingAccounts: boolean;
  loadingMovements: boolean;
  mutatingAccount: boolean;
  error: string | null;
  fetchAccounts: (businessId: number) => Promise<void>;
  fetchMovements: (businessId: number, filters?: TreasuryMovementFilters) => Promise<void>;
  createAccount: (businessId: number, payload: TreasuryAccountPayload) => Promise<TreasuryAccount>;
  updateAccount: (businessId: number, accountId: number, payload: TreasuryAccountPayload) => Promise<TreasuryAccount>;
  reset: () => void;
}

const initialState = {
  businessId: null,
  accounts: [] as TreasuryAccount[],
  accountsSummary: null as TreasuryAccountsSummary | null,
  movements: [] as TreasuryMovement[],
  loadingAccounts: false,
  loadingMovements: false,
  mutatingAccount: false,
  error: null as string | null,
};

export const useTreasuryStore = create<TreasuryState>((set) => ({
  ...initialState,

  fetchAccounts: async (businessId) => {
    if (!isPureOfflineRuntime() && !isBackendCapabilitySupported('treasury')) {
      set({
        businessId,
        accounts: [],
        accountsSummary: null,
        loadingAccounts: false,
        error: null,
      });
      return;
    }

    set({ loadingAccounts: true, error: null });
    try {
      const response = await treasuryService.listAccounts(businessId, { include_inactive: true });
      await offlineSyncService.cacheTreasuryAccounts(businessId, response.accounts || []);
      set({
        businessId,
        accounts: sortTreasuryAccounts(response.accounts || []),
        accountsSummary: response.summary || null,
        loadingAccounts: false,
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const accounts = await offlineSyncService.getTreasuryAccountsFromLocal(businessId);
        set({
          businessId,
          accounts: sortTreasuryAccounts(accounts),
          accountsSummary: null,
          loadingAccounts: false,
          error: null,
        });
        return;
      }

      set({
        loadingAccounts: false,
        error: error?.response?.data?.error || error?.message || 'No se pudieron cargar las cuentas de tesoreria',
      });
      throw error;
    }
  },

  fetchMovements: async (businessId, filters) => {
    if (!isPureOfflineRuntime() && !isBackendCapabilitySupported('treasury')) {
      set({
        businessId,
        movements: [],
        loadingMovements: false,
        error: null,
      });
      return;
    }

    set({ loadingMovements: true, error: null });
    try {
      const response = await treasuryService.listMovements(businessId, filters);
      set({
        businessId,
        movements: response.movements || [],
        loadingMovements: false,
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        set({
          businessId,
          movements: [],
          loadingMovements: false,
          error: null,
        });
        return;
      }

      set({
        loadingMovements: false,
        error: error?.response?.data?.error || error?.message || 'No se pudieron cargar los movimientos de tesoreria',
      });
      throw error;
    }
  },

  createAccount: async (businessId, payload) => {
    if (!isPureOfflineRuntime() && !isBackendCapabilitySupported('treasury')) {
      throw new Error('Tesoreria no esta disponible en este momento');
    }

    set({ mutatingAccount: true, error: null });
    try {
      const response = await treasuryService.createAccount(businessId, payload);
      await useTreasuryStore.getState().fetchAccounts(businessId);
      set({ mutatingAccount: false });
      return response.account;
    } catch (error: any) {
      set({
        mutatingAccount: false,
        error: error?.response?.data?.error || error?.message || 'No se pudo crear la cuenta de tesoreria',
      });
      throw error;
    }
  },

  updateAccount: async (businessId, accountId, payload) => {
    if (!isPureOfflineRuntime() && !isBackendCapabilitySupported('treasury')) {
      throw new Error('Tesoreria no esta disponible en este momento');
    }

    set({ mutatingAccount: true, error: null });
    try {
      const response = await treasuryService.updateAccount(businessId, accountId, payload);
      await useTreasuryStore.getState().fetchAccounts(businessId);
      set({ mutatingAccount: false });
      return response.account;
    } catch (error: any) {
      set({
        mutatingAccount: false,
        error: error?.response?.data?.error || error?.message || 'No se pudo actualizar la cuenta de tesoreria',
      });
      throw error;
    }
  },

  reset: () => set({ ...initialState }),
}));
