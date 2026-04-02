import { create } from 'zustand';
import { SupplierPayable, SupplierPayablesSupplierSummary } from '../types';
import { supplierPayablesService, SupplierPayableFilters, SupplierPaymentPayload } from '../services/supplierPayablesService';

interface SupplierPayablesState {
  payables: SupplierPayable[];
  selectedPayable: SupplierPayable | null;
  supplierSummary: SupplierPayablesSupplierSummary[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchPayables: (businessId: number, filters?: SupplierPayableFilters) => Promise<void>;
  fetchPayable: (businessId: number, payableId: number) => Promise<SupplierPayable | null>;
  fetchSupplierPayables: (businessId: number, supplierId: number, status?: 'pending' | 'partial' | 'paid') => Promise<void>;
  addPayment: (businessId: number, payableId: number, payload: SupplierPaymentPayload) => Promise<SupplierPayable>;
  setSelectedPayable: (payable: SupplierPayable | null) => void;
}

const upsertPayable = (payables: SupplierPayable[], payable: SupplierPayable) => {
  const exists = payables.some((item) => item.id === payable.id);
  if (!exists) return [payable, ...payables];
  return payables.map((item) => (item.id === payable.id ? payable : item));
};

const summarizePayables = (payables: SupplierPayable[]): SupplierPayablesSupplierSummary[] => {
  const grouped = new Map<number, SupplierPayablesSupplierSummary>();
  payables.forEach((payable) => {
    const current = grouped.get(payable.supplier_id) || {
      supplier_id: payable.supplier_id,
      supplier_name: payable.supplier_name || 'Proveedor',
      total_amount: 0,
      amount_paid: 0,
      balance_due: 0,
      pending_count: 0,
    };
    current.total_amount = Number((current.total_amount + Number(payable.amount_total || 0)).toFixed(4));
    current.amount_paid = Number((current.amount_paid + Number(payable.amount_paid || 0)).toFixed(4));
    current.balance_due = Number((current.balance_due + Number(payable.balance_due || 0)).toFixed(4));
    if (payable.status !== 'paid') current.pending_count += 1;
    grouped.set(payable.supplier_id, current);
  });
  return Array.from(grouped.values());
};

export const useSupplierPayablesStore = create<SupplierPayablesState>((set) => ({
  payables: [],
  selectedPayable: null,
  supplierSummary: [],
  loading: false,
  saving: false,
  error: null,

  fetchPayables: async (businessId, filters) => {
    set({ loading: true, error: null });
    try {
      const result = await supplierPayablesService.list(businessId, filters);
      set({
        payables: result.supplier_payables,
        supplierSummary: result.suppliers_summary,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchPayable: async (businessId, payableId) => {
    set({ loading: true, error: null });
    try {
      const payable = await supplierPayablesService.get(businessId, payableId);
      set((state) => ({
        selectedPayable: payable,
        payables: upsertPayable(state.payables, payable),
      }));
      return payable;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchSupplierPayables: async (businessId, supplierId, status) => {
    set({ loading: true, error: null });
    try {
      const result = await supplierPayablesService.getBySupplier(businessId, supplierId, status);
      set({
        payables: result.supplier_payables,
        supplierSummary: result.summary ? [result.summary] : [],
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  addPayment: async (businessId, payableId, payload) => {
    set({ saving: true, error: null });
    try {
      const result = await supplierPayablesService.addPayment(businessId, payableId, payload);
      set((state) => ({
        supplierSummary: summarizePayables(upsertPayable(state.payables, result.supplier_payable)),
        selectedPayable: state.selectedPayable?.id === result.supplier_payable.id ? result.supplier_payable : state.selectedPayable,
        payables: upsertPayable(state.payables, result.supplier_payable),
      }));
      return result.supplier_payable;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  setSelectedPayable: (payable) => set({ selectedPayable: payable }),
}));
