import { create } from 'zustand';
import api from '../services/api';
import { Expense } from '../types';
import { buildBusinessExpensesQueryParams, getBusinessExpensesPath } from '../services/businessApiRoutes';
import { hasOfflineSessionSeed } from '../services/offlineSession';
import { nextLocalNumericId, readCompatibleOfflineExpenses, writeCompatibleOfflineExpenses } from '../services/offlineLocalData';

const shouldUseLocalOnly = () => !localStorage.getItem('token') && hasOfflineSessionSeed();

const sortExpenses = (expenses: Expense[]) => [...expenses].sort((left, right) => {
  const rightTime = new Date(right.expense_date || right.created_at || 0).getTime();
  const leftTime = new Date(left.expense_date || left.created_at || 0).getTime();
  return rightTime - leftTime;
});

const filterExpenses = (
  expenses: Expense[],
  opts?: { category?: string; start_date?: string; end_date?: string; search?: string }
) => {
  const search = String(opts?.search || '').trim().toLowerCase();
  return expenses.filter((expense) => {
    if (opts?.category && opts.category !== 'all' && expense.category !== opts.category) return false;
    if (opts?.start_date && String(expense.expense_date || '') < opts.start_date) return false;
    if (opts?.end_date && String(expense.expense_date || '') > opts.end_date) return false;
    if (!search) return true;
    return [expense.category, expense.description, expense.source_type, expense.raw_purchase_number]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
};

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
      if (shouldUseLocalOnly()) {
        const expenses = filterExpenses(readCompatibleOfflineExpenses(businessId), opts);
        set({ expenses: sortExpenses(expenses) });
        return;
      }
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
      if (error?.isOfflineRequestError || !error?.response) {
        const expenses = filterExpenses(readCompatibleOfflineExpenses(businessId), opts);
        set({ expenses: sortExpenses(expenses), error: null });
      } else {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },
  addExpense: async (businessId, expense) => {
    set({ loading: true, error: null });
    try {
      if (shouldUseLocalOnly()) {
        const currentExpenses = readCompatibleOfflineExpenses(businessId);
        const createdExpense: Expense = {
          ...(expense as Expense),
          id: nextLocalNumericId(currentExpenses),
          business_id: businessId,
          created_at: new Date().toISOString(),
        };
        const nextExpenses = sortExpenses([createdExpense, ...currentExpenses]);
        writeCompatibleOfflineExpenses(businessId, nextExpenses);
        set({ expenses: nextExpenses });
        return;
      }
      const response = await api.post(`/businesses/${businessId}/expenses`, expense);
      set((state) => ({ expenses: [response.data.expense, ...state.expenses] }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const currentExpenses = readCompatibleOfflineExpenses(businessId);
        const createdExpense: Expense = {
          ...(expense as Expense),
          id: nextLocalNumericId(currentExpenses),
          business_id: businessId,
          created_at: new Date().toISOString(),
        };
        const nextExpenses = sortExpenses([createdExpense, ...currentExpenses]);
        writeCompatibleOfflineExpenses(businessId, nextExpenses);
        set({ expenses: nextExpenses, error: null });
      } else {
        set({ error: error.message });
        throw error;
      }
    } finally {
      set({ loading: false });
    }
  },
  updateExpense: async (businessId, expenseId, expense) => {
    set({ loading: true, error: null });
    try {
      if (shouldUseLocalOnly()) {
        const currentExpenses = readCompatibleOfflineExpenses(businessId);
        const nextExpenses = sortExpenses(currentExpenses.map((item) => (
          item.id === expenseId
            ? { ...item, ...expense, id: item.id, business_id: item.business_id, updated_at: new Date().toISOString() }
            : item
        )));
        writeCompatibleOfflineExpenses(businessId, nextExpenses);
        set({ expenses: nextExpenses });
        return;
      }
      const response = await api.put(`/businesses/${businessId}/expenses/${expenseId}`, expense);
      set((state) => ({
        expenses: state.expenses.map((item) => (item.id === expenseId ? response.data.expense : item)),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const currentExpenses = readCompatibleOfflineExpenses(businessId);
        const nextExpenses = sortExpenses(currentExpenses.map((item) => (
          item.id === expenseId
            ? { ...item, ...expense, id: item.id, business_id: item.business_id, updated_at: new Date().toISOString() }
            : item
        )));
        writeCompatibleOfflineExpenses(businessId, nextExpenses);
        set({ expenses: nextExpenses, error: null });
      } else {
        set({ error: error.message });
        throw error;
      }
    } finally {
      set({ loading: false });
    }
  },
  deleteExpense: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      if (shouldUseLocalOnly()) {
        const nextExpenses = readCompatibleOfflineExpenses(businessId).filter((expense) => expense.id !== id);
        writeCompatibleOfflineExpenses(businessId, nextExpenses);
        set({ expenses: nextExpenses });
        return;
      }
      await api.delete(`/businesses/${businessId}/expenses/${id}`);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const nextExpenses = readCompatibleOfflineExpenses(businessId).filter((expense) => expense.id !== id);
        writeCompatibleOfflineExpenses(businessId, nextExpenses);
        set({ expenses: nextExpenses, error: null });
      } else {
        set({ error: error.message });
        throw error;
      }
    } finally {
      set({ loading: false });
    }
  },
}));
