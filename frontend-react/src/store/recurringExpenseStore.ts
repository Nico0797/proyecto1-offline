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
  is_active: boolean;
  next_due_date?: string;
  created_at: string;
}

interface RecurringExpenseState {
  recurringExpenses: RecurringExpense[];
  loading: boolean;
  error: string | null;
  fetchRecurringExpenses: (businessId: number) => Promise<void>;
  addRecurringExpense: (businessId: number, expense: Omit<RecurringExpense, 'id' | 'business_id' | 'created_at' | 'next_due_date'>) => Promise<void>;
  updateRecurringExpense: (businessId: number, id: number, updates: Partial<RecurringExpense>) => Promise<void>;
  deleteRecurringExpense: (businessId: number, id: number) => Promise<void>;
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
      set({ recurringExpenses: response.data.recurring_expenses });
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
        recurringExpenses: state.recurringExpenses.map((e) => (e.id === id ? response.data.recurring_expense : e)),
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
        recurringExpenses: state.recurringExpenses.filter((e) => e.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
