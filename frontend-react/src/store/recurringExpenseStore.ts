import { create } from 'zustand';
import api from '../services/api';

export interface RecurringExpense {
  id: number;
  business_id: number;
  name: string;
  amount: number;
  due_day: number;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'annual';
  category: string;
  payment_flow?: 'cash' | 'payable';
  creditor_name?: string | null;
  is_active: boolean;
  next_due_date?: string;
  created_at: string;
}

export interface RecurringExpensePayload {
  name: string;
  amount: number;
  due_day: number;
  frequency: RecurringExpense['frequency'];
  category: string;
  payment_flow?: RecurringExpense['payment_flow'];
  creditor_name?: string | null;
  is_active: boolean;
  next_due_date?: string;
}

interface RecurringExpenseState {
  recurringExpenses: RecurringExpense[];
  loading: boolean;
  error: string | null;
  fetchRecurringExpenses: (businessId: number) => Promise<void>;
  addRecurringExpense: (businessId: number, expense: RecurringExpensePayload) => Promise<void>;
  updateRecurringExpense: (businessId: number, id: number, updates: Partial<RecurringExpense>) => Promise<void>;
  deleteRecurringExpense: (businessId: number, id: number) => Promise<void>;
  markRecurringAsPaid: (businessId: number, id: number, payload?: { expense_date?: string; payment_method?: string; treasury_account_id?: number | null; description?: string }) => Promise<void>;
  generateRecurringDebt: (businessId: number, id: number, payload?: { note?: string }) => Promise<any>;
}

export const useRecurringExpenseStore = create<RecurringExpenseState>((set) => ({
  recurringExpenses: [],
  loading: false,
  error: null,
  fetchRecurringExpenses: async (businessId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ recurringExpenses: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/businesses/${businessId}/recurring-expenses`);
      set({ recurringExpenses: Array.isArray(response.data?.recurring_expenses) ? response.data.recurring_expenses : [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addRecurringExpense: async (businessId, expense) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/recurring-expenses`, expense);
      set((state) => ({ recurringExpenses: [...state.recurringExpenses, response.data.recurring_expense] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateRecurringExpense: async (businessId, id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/businesses/${businessId}/recurring-expenses/${id}`, updates);
      set((state) => ({
        recurringExpenses: state.recurringExpenses.map((item) => (item.id === id ? response.data.recurring_expense : item)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteRecurringExpense: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/recurring-expenses/${id}`);
      set((state) => ({
        recurringExpenses: state.recurringExpenses.filter((item) => item.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  markRecurringAsPaid: async (businessId, id, payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/recurring-expenses/${id}/mark-paid`, payload || {});
      set((state) => ({
        recurringExpenses: state.recurringExpenses.map((item) => (item.id === id ? response.data.recurring_expense : item)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  generateRecurringDebt: async (businessId, id, payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/recurring-expenses/${id}/generate-debt`, payload || {});
      set((state) => ({
        recurringExpenses: state.recurringExpenses.map((item) => (item.id === id ? response.data.recurring_expense : item)),
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
