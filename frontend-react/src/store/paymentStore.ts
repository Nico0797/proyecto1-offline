import { create } from 'zustand';
import api from '../services/api';

export interface Payment {
  id: number;
  business_id: number;
  customer_id: number;
  sale_id?: number;
  payment_date: string;
  amount: number;
  method: 'cash' | 'transfer';
  note?: string;
  created_at: string;
  customer_name?: string; // Derived from join if available
}

interface PaymentState {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  fetchPayments: (businessId: number, filters?: any) => Promise<void>;
  createPayment: (businessId: number, paymentData: any) => Promise<void>;
  deletePayment: (businessId: number, id: number) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  loading: false,
  error: null,
  fetchPayments: async (businessId, filters) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ payments: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/businesses/${businessId}/payments?${params.toString()}`);
      set({ payments: response.data.payments });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  createPayment: async (businessId, paymentData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/payments`, paymentData);
      set((state) => ({ payments: [response.data.payment, ...state.payments] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deletePayment: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/payments/${id}`);
      set((state) => ({
        payments: state.payments.filter((p) => p.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
