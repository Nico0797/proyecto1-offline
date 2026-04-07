import { create } from 'zustand';
import api from '../services/api';
import { Sale } from '../types';
import { offlineSyncService } from '../services/offlineSyncService';

interface FetchSalesOptions {
  includeItems?: boolean;
}

interface SaleState {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  fetchSales: (businessId: number, options?: FetchSalesOptions) => Promise<void>;
  createSale: (businessId: number, saleData: any) => Promise<void>;
  updateSale: (businessId: number, id: number, saleData: Partial<Sale>) => Promise<void>;
  deleteSale: (businessId: number, id: number) => Promise<void>;
}

export const useSaleStore = create<SaleState>((set, get) => ({
  sales: [],
  loading: false,
  error: null,
  fetchSales: async (businessId, options) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ sales: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const includeItems = options?.includeItems ?? false;
      const response = await api.get(`/businesses/${businessId}/sales`, {
        params: { include_items: includeItems ? 'true' : 'false' },
      });
      const sales = response.data.sales || [];
      if (includeItems) {
        await offlineSyncService.cacheSales(businessId, sales);
      }
      set({ sales });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const sales = await offlineSyncService.getSalesFromLocal(businessId);
        set({ sales, error: null });
        return;
      }

      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  createSale: async (businessId, saleData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/sales`, saleData);
      const nextSale = response.data.sale;
      await offlineSyncService.cacheSales(businessId, [nextSale, ...get().sales.filter((sale: Sale) => sale.id !== nextSale.id)]);
      set((state) => {
        const existingIndex = state.sales.findIndex((sale) => sale.id === nextSale.id);
        if (existingIndex >= 0) {
          const updatedSales = [...state.sales];
          updatedSales[existingIndex] = nextSale;
          return { sales: updatedSales };
        }
        return { sales: [nextSale, ...state.sales] };
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineSale = await offlineSyncService.createOfflineSale(businessId, saleData);
        set((state) => ({ sales: [offlineSale, ...state.sales.filter((sale) => sale.id !== offlineSale.id)] }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateSale: async (businessId, id, saleData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/businesses/${businessId}/sales/${id}`, saleData);
      const updated: Sale = response.data.sale || { ...saleData, id, business_id: businessId } as Sale;
      await offlineSyncService.cacheSales(
        businessId,
        get().sales.map((sale: Sale) => (sale.id === id ? { ...sale, ...updated } : sale))
      );
      set((state) => ({
        sales: state.sales.map((sale) => (sale.id === id ? { ...sale, ...updated } : sale)),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineSale = await offlineSyncService.updateOfflineSale(businessId, id, saleData);
        set((state) => ({
          sales: state.sales.map((sale) => (sale.id === id ? { ...sale, ...offlineSale } : sale)),
          error: null,
        }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteSale: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/sales/${id}`);
      await offlineSyncService.cacheSales(
        businessId,
        get().sales.filter((sale: Sale) => sale.id !== id)
      );
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== id),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.deleteOfflineSale(businessId, id);
        set((state) => ({
          sales: state.sales.filter((sale) => sale.id !== id),
          error: null,
        }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
