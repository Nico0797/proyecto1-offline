import { create } from 'zustand';
import { Sale } from '../types';
import { offlineSyncService } from '../services/offlineSyncService';
import { salesRepository } from '../repositories/salesRepository';

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

const getSaleSortTimestamp = (sale: Sale) => {
  const createdAt = sale.created_at ? new Date(sale.created_at).getTime() : Number.NaN;
  if (Number.isFinite(createdAt)) return createdAt;
  const saleDate = sale.sale_date ? new Date(sale.sale_date).getTime() : Number.NaN;
  if (Number.isFinite(saleDate)) return saleDate;
  return 0;
};

const sortSalesByRecency = (sales: Sale[]) =>
  [...sales].sort((left, right) => {
    const timestampDelta = getSaleSortTimestamp(right) - getSaleSortTimestamp(left);
    if (timestampDelta !== 0) return timestampDelta;
    return Number(right.id || 0) - Number(left.id || 0);
  });

export const useSaleStore = create<SaleState>((set, get) => ({
  sales: [],
  loading: false,
  error: null,
  fetchSales: async (businessId, options) => {
    set({ loading: true, error: null });
    try {
      const sales = await salesRepository.list(businessId, options);
      set({ sales: sortSalesByRecency(sales) });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  createSale: async (businessId, saleData) => {
    set({ loading: true, error: null });
    try {
      const nextSale = await salesRepository.create(businessId, saleData);
      await offlineSyncService.cacheSales(
        businessId,
        sortSalesByRecency([nextSale, ...get().sales.filter((sale: Sale) => sale.id !== nextSale.id)])
      );
      set((state) => {
        const existingIndex = state.sales.findIndex((sale) => sale.id === nextSale.id);
        if (existingIndex >= 0) {
          const updatedSales = [...state.sales];
          updatedSales[existingIndex] = nextSale;
          return { sales: sortSalesByRecency(updatedSales) };
        }
        return { sales: sortSalesByRecency([nextSale, ...state.sales]) };
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateSale: async (businessId, id, saleData) => {
    set({ loading: true, error: null });
    try {
      const updated = await salesRepository.update(businessId, id, saleData);
      const nextSales = sortSalesByRecency(
        get().sales.map((sale: Sale) => (sale.id === id ? { ...sale, ...updated } : sale))
      );
      await offlineSyncService.cacheSales(
        businessId,
        nextSales
      );
      set({ sales: nextSales });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteSale: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await salesRepository.remove(businessId, id);
      await offlineSyncService.cacheSales(
        businessId,
        get().sales.filter((sale: Sale) => sale.id !== id)
      );
      set((state) => ({
        sales: state.sales.filter((sale) => sale.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
