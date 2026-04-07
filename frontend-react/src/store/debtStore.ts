import { create } from 'zustand';
import { debtService } from '../services/debtService';
import { Debt, DebtsSummary } from '../types/debts';

interface DebtState {
  debts: Debt[];
  summary: DebtsSummary | null;
  loading: boolean;
  error: string | null;
  
  fetchDebts: (
    businessId: number,
    filters?: { status?: string; category?: string; search?: string; scope?: 'operational' | 'financial' }
  ) => Promise<void>;
  fetchSummary: (businessId: number, scope?: 'operational' | 'financial') => Promise<void>;
  addDebt: (businessId: number, debt: Partial<Debt>) => Promise<void>;
  updateDebt: (businessId: number, debtId: number, debt: Partial<Debt>) => Promise<void>;
  deleteDebt: (businessId: number, debtId: number) => Promise<void>;
  addPayment: (businessId: number, debtId: number, payment: { amount: number; payment_date: string; payment_method?: string; treasury_account_id?: number | null; note?: string }) => Promise<void>;
  deletePayment: (businessId: number, debtId: number, paymentId: number) => Promise<void>;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debts: [],
  summary: null,
  loading: false,
  error: null,

  fetchDebts: async (businessId, filters) => {
    set({ loading: true, error: null });
    try {
      const debts = await debtService.getDebts(businessId, filters);
      set({ debts, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSummary: async (businessId, scope) => {
    try {
      const summary = await debtService.getSummary(businessId, scope);
      set({ summary });
    } catch (error: any) {
      console.error("Error fetching summary:", error);
    }
  },

  addDebt: async (businessId, debt) => {
    set({ loading: true, error: null });
    try {
      const newDebt = await debtService.createDebt(businessId, debt);
      set((state) => ({ 
        debts: [...state.debts, newDebt],
        loading: false 
      }));
      get().fetchSummary(businessId, debt.scope);
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateDebt: async (businessId, debtId, debt) => {
    set({ loading: true, error: null });
    try {
      const updatedDebt = await debtService.updateDebt(businessId, debtId, debt);
      set((state) => ({
        debts: state.debts.map((d) => (d.id === debtId ? updatedDebt : d)),
        loading: false
      }));
      get().fetchSummary(businessId, debt.scope ?? updatedDebt.scope);
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteDebt: async (businessId, debtId) => {
    set({ loading: true, error: null });
    try {
      await debtService.deleteDebt(businessId, debtId);
      set((state) => ({
        debts: state.debts.filter((d) => d.id !== debtId),
        loading: false
      }));
      get().fetchSummary(businessId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addPayment: async (businessId, debtId, payment) => {
    set({ loading: true, error: null });
    try {
      const result = await debtService.addPayment(businessId, debtId, payment);
      set((state) => ({
        debts: state.debts.map((d) => (d.id === debtId ? result.debt : d)),
        loading: false
      }));
      get().fetchSummary(businessId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deletePayment: async (businessId, debtId, paymentId) => {
    set({ loading: true, error: null });
    try {
      const result = await debtService.deletePayment(businessId, debtId, paymentId);
      set((state) => ({
        debts: state.debts.map((d) => (d.id === debtId ? result.debt : d)),
        loading: false
      }));
      get().fetchSummary(businessId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));
