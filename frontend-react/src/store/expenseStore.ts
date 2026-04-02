import { create } from 'zustand';
import api from '../services/api';
import { Expense } from '../types';
import { buildBusinessExpensesQueryParams, getBusinessExpensesPath } from '../services/businessApiRoutes';

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  fetchExpenses: (businessId: number, opts?: { category?: string; start_date?: string; end_date?: string; search?: string }) => Promise<void>;
  addExpense: (businessId: number, expense: Omit<Expense, 'id' | 'business_id'>) => Promise<void>;
  updateExpense: (businessId: number, expenseId: number, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (businessId: number, id: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  loading: false,
  error: null,
  fetchExpenses: async (businessId, opts) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(getBusinessExpensesPath(businessId), {
        params: buildBusinessExpensesQueryParams({
          category: opts?.category,
          start_date: opts?.start_date,
          end_date: opts?.end_date,
          search: opts?.search,
        }),
      });
      set({ expenses: Array.isArray(response.data?.expenses) ? response.data.expenses : [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addExpense: async (businessId, expense) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/expenses`, expense);
      set((state) => ({ expenses: [response.data.expense, ...state.expenses] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateExpense: async (businessId, expenseId, expense) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/businesses/${businessId}/expenses/${expenseId}`, expense);
      set((state) => ({
        expenses: state.expenses.map((item) => (item.id === expenseId ? response.data.expense : item)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteExpense: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/expenses/${id}`);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
