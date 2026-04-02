import api from './api';
import { Debt, DebtPayment, DebtsSummary } from '../types/debts';

export interface DebtPayload extends Partial<Debt> {
  initial_payment_amount?: number;
  initial_payment_note?: string;
  payment_method?: string;
  treasury_account_id?: number | null;
}

export const debtService = {
  getDebts: async (
    businessId: number,
    filters?: { status?: string; category?: string; search?: string; scope?: 'operational' | 'financial' }
  ) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.scope) params.append('scope', filters.scope);
    
    const response = await api.get<{ debts: Debt[] }>(`/businesses/${businessId}/debts`, { params });
    return response.data.debts;
  },

  createDebt: async (businessId: number, data: DebtPayload) => {
    const response = await api.post<{ debt: Debt }>(`/businesses/${businessId}/debts`, data);
    return response.data.debt;
  },

  updateDebt: async (businessId: number, debtId: number, data: DebtPayload) => {
    const response = await api.put<{ debt: Debt }>(`/businesses/${businessId}/debts/${debtId}`, data);
    return response.data.debt;
  },

  deleteDebt: async (businessId: number, debtId: number) => {
    const response = await api.delete(`/businesses/${businessId}/debts/${debtId}`);
    return response.data;
  },

  getPayments: async (businessId: number, debtId: number) => {
    const response = await api.get<{ payments: DebtPayment[] }>(`/businesses/${businessId}/debts/${debtId}/payments`);
    return response.data.payments;
  },

  addPayment: async (businessId: number, debtId: number, data: { amount: number; payment_date: string; payment_method?: string; treasury_account_id?: number | null; note?: string }) => {
    const response = await api.post<{ payment: DebtPayment; debt: Debt }>(`/businesses/${businessId}/debts/${debtId}/payments`, data);
    return response.data;
  },

  deletePayment: async (businessId: number, debtId: number, paymentId: number) => {
    const response = await api.delete<{ ok: boolean; debt: Debt }>(`/businesses/${businessId}/debts/${debtId}/payments/${paymentId}`);
    return response.data;
  },

  getSummary: async (businessId: number, scope?: 'operational' | 'financial') => {
    const response = await api.get<DebtsSummary>(`/businesses/${businessId}/debts/summary`, {
      params: scope ? { scope } : undefined,
    });
    return response.data;
  }
};
