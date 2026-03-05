import { create } from 'zustand';
import api from '../services/api';
import { Sale } from '../types';

interface SaleState {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  fetchSales: (businessId: number) => Promise<void>;
  createSale: (businessId: number, saleData: any) => Promise<void>;
  deleteSale: (businessId: number, id: number) => Promise<void>;
}

export const useSaleStore = create<SaleState>((set) => ({
  sales: [],
  loading: false,
  error: null,
  fetchSales: async (businessId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ sales: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/businesses/${businessId}/sales`);
      set({ sales: response.data.sales });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  createSale: async (businessId, saleData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/sales`, saleData);
      set((state) => ({ sales: [response.data.sale, ...state.sales] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteSale: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/sales/${id}`);
      set((state) => ({
        sales: state.sales.filter((s) => s.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
