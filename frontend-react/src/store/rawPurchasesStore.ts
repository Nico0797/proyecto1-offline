import { create } from 'zustand';
import { RawPurchase } from '../types';
import { rawPurchasesService, RawPurchaseFilters, RawPurchasePayload } from '../services/rawPurchasesService';

interface RawPurchasesState {
  purchases: RawPurchase[];
  selectedPurchase: RawPurchase | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchPurchases: (businessId: number, filters?: RawPurchaseFilters) => Promise<void>;
  fetchPurchase: (businessId: number, purchaseId: number) => Promise<RawPurchase | null>;
  createPurchase: (businessId: number, payload: RawPurchasePayload) => Promise<RawPurchase>;
  updatePurchase: (businessId: number, purchaseId: number, payload: RawPurchasePayload) => Promise<RawPurchase>;
  confirmPurchase: (
    businessId: number,
    purchaseId: number,
    payload?: { financial_flow?: 'cash' | 'payable'; payment_method?: string | null; treasury_account_id?: number | null }
  ) => Promise<RawPurchase>;
  cancelPurchase: (businessId: number, purchaseId: number) => Promise<RawPurchase>;
  setSelectedPurchase: (purchase: RawPurchase | null) => void;
}

const upsertPurchase = (purchases: RawPurchase[], purchase: RawPurchase) => {
  const exists = purchases.some((item) => item.id === purchase.id);
  if (!exists) return [purchase, ...purchases];
  return purchases.map((item) => (item.id === purchase.id ? purchase : item));
};

export const useRawPurchasesStore = create<RawPurchasesState>((set) => ({
  purchases: [],
  selectedPurchase: null,
  loading: false,
  saving: false,
  error: null,

  fetchPurchases: async (businessId, filters) => {
    set({ loading: true, error: null });
    try {
      const purchases = await rawPurchasesService.list(businessId, filters);
      set({ purchases });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchPurchase: async (businessId, purchaseId) => {
    set({ loading: true, error: null });
    try {
      const purchase = await rawPurchasesService.get(businessId, purchaseId);
      set((state) => ({
        selectedPurchase: purchase,
        purchases: upsertPurchase(state.purchases, purchase),
      }));
      return purchase;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createPurchase: async (businessId, payload) => {
    set({ saving: true, error: null });
    try {
      const purchase = await rawPurchasesService.create(businessId, payload);
      set((state) => ({
        purchases: [purchase, ...state.purchases],
        selectedPurchase: purchase,
      }));
      return purchase;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updatePurchase: async (businessId, purchaseId, payload) => {
    set({ saving: true, error: null });
    try {
      const purchase = await rawPurchasesService.update(businessId, purchaseId, payload);
      set((state) => ({
        purchases: upsertPurchase(state.purchases, purchase),
        selectedPurchase: state.selectedPurchase?.id === purchase.id ? purchase : state.selectedPurchase,
      }));
      return purchase;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  confirmPurchase: async (businessId, purchaseId, payload) => {
    set({ saving: true, error: null });
    try {
      const purchase = await rawPurchasesService.confirm(businessId, purchaseId, payload);
      set((state) => ({
        purchases: upsertPurchase(state.purchases, purchase),
        selectedPurchase: state.selectedPurchase?.id === purchase.id ? purchase : state.selectedPurchase,
      }));
      return purchase;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  cancelPurchase: async (businessId, purchaseId) => {
    set({ saving: true, error: null });
    try {
      const purchase = await rawPurchasesService.cancel(businessId, purchaseId);
      set((state) => ({
        purchases: upsertPurchase(state.purchases, purchase),
        selectedPurchase: state.selectedPurchase?.id === purchase.id ? purchase : state.selectedPurchase,
      }));
      return purchase;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  setSelectedPurchase: (purchase) => set({ selectedPurchase: purchase }),
}));
