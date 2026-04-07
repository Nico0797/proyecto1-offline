import { create } from 'zustand';
import { Supplier } from '../types';
import { supplierService, SupplierFilters, SupplierPayload } from '../services/supplierService';

interface SupplierState {
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchSuppliers: (businessId: number, filters?: SupplierFilters) => Promise<void>;
  fetchSupplier: (businessId: number, supplierId: number) => Promise<Supplier | null>;
  createSupplier: (businessId: number, payload: SupplierPayload) => Promise<Supplier>;
  updateSupplier: (businessId: number, supplierId: number, payload: SupplierPayload) => Promise<Supplier>;
  deactivateSupplier: (businessId: number, supplierId: number) => Promise<Supplier>;
  setSelectedSupplier: (supplier: Supplier | null) => void;
}

const upsertSupplier = (suppliers: Supplier[], supplier: Supplier) => {
  const exists = suppliers.some((item) => item.id === supplier.id);
  if (!exists) return [supplier, ...suppliers];
  return suppliers.map((item) => (item.id === supplier.id ? supplier : item));
};

export const useSupplierStore = create<SupplierState>((set) => ({
  suppliers: [],
  selectedSupplier: null,
  loading: false,
  saving: false,
  error: null,

  fetchSuppliers: async (businessId, filters) => {
    set({ loading: true, error: null });
    try {
      const suppliers = await supplierService.list(businessId, filters);
      set({ suppliers });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchSupplier: async (businessId, supplierId) => {
    set({ loading: true, error: null });
    try {
      const supplier = await supplierService.get(businessId, supplierId);
      set((state) => ({
        selectedSupplier: supplier,
        suppliers: upsertSupplier(state.suppliers, supplier),
      }));
      return supplier;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createSupplier: async (businessId, payload) => {
    set({ saving: true, error: null });
    try {
      const supplier = await supplierService.create(businessId, payload);
      set((state) => ({
        suppliers: [supplier, ...state.suppliers],
        selectedSupplier: supplier,
      }));
      return supplier;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updateSupplier: async (businessId, supplierId, payload) => {
    set({ saving: true, error: null });
    try {
      const supplier = await supplierService.update(businessId, supplierId, payload);
      set((state) => ({
        suppliers: upsertSupplier(state.suppliers, supplier),
        selectedSupplier: state.selectedSupplier?.id === supplier.id ? supplier : state.selectedSupplier,
      }));
      return supplier;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  deactivateSupplier: async (businessId, supplierId) => {
    set({ saving: true, error: null });
    try {
      const supplier = await supplierService.deactivate(businessId, supplierId);
      set((state) => ({
        suppliers: upsertSupplier(state.suppliers, supplier),
        selectedSupplier: state.selectedSupplier?.id === supplier.id ? supplier : state.selectedSupplier,
      }));
      return supplier;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }),
}));
