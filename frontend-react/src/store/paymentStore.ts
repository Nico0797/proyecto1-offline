import { create } from 'zustand';
import api from '../services/api';
import type { Payment as PaymentType } from '../types';
import { useBusinessStore } from './businessStore';
import { offlineSyncService } from '../services/offlineSyncService';

export type { Payment } from '../types';

interface PaymentState {
  payments: PaymentType[];
  loading: boolean;
  error: string | null;
  fetchPayments: (businessId: number, filters?: any) => Promise<void>;
  createPayment: (businessId: number, paymentData: any) => Promise<void>;
  updatePayment: (businessId: number, id: number, paymentData: Partial<PaymentType>) => Promise<void>;
  deletePayment: (businessId: number, id: number) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  loading: false,
  error: null,
  fetchPayments: async (businessId, filters) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ payments: [], loading: false });
      return;
    }

    // Pre-gating: Check if accounts_receivable module is enabled
    // This prevents unnecessary 403 errors
    const businessStore = useBusinessStore.getState();
    const activeBusiness = businessStore.activeBusiness;
    
    if (!activeBusiness?.modules?.find((m: any) => m.module_key === 'accounts_receivable' && m.enabled)) {
      set({ payments: [], loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters || {});
      if (!params.has('include_allocations')) {
        params.set('include_allocations', 'false');
      }
      const response = await api.get(`/businesses/${businessId}/payments?${params.toString()}`);
      const payments = response.data.payments || [];
      await offlineSyncService.cachePayments(businessId, payments);
      set({ payments });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        let payments = await offlineSyncService.getPaymentsFromLocal(businessId);

        if (filters?.search) {
          const search = String(filters.search).toLowerCase();
          payments = payments.filter((payment) =>
            (payment.customer_name || '').toLowerCase().includes(search) ||
            (payment.note || '').toLowerCase().includes(search)
          );
        }

        if (filters?.start_date) {
          const start = new Date(filters.start_date);
          payments = payments.filter((payment) => new Date(payment.payment_date) >= start);
        }

        if (filters?.end_date) {
          const end = new Date(filters.end_date);
          end.setHours(23, 59, 59, 999);
          payments = payments.filter((payment) => new Date(payment.payment_date) <= end);
        }

        set({ payments, error: null });
        return;
      }

      // Silently handle 403 (already handled by pre-gating but just in case)
      if (error.response?.status === 403) {
          set({ payments: [], error: null }); // No error visible
      } else {
          set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },
  createPayment: async (businessId, paymentData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/payments`, paymentData);
      const nextPayment = response.data.payment;
      await offlineSyncService.cachePayments(businessId, [nextPayment, ...get().payments.filter((payment: PaymentType) => payment.id !== nextPayment.id)]);
      set((state) => ({ payments: [nextPayment, ...state.payments] }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlinePayment = await offlineSyncService.createOfflinePayment(businessId, paymentData);
        set((state) => ({ payments: [offlinePayment, ...state.payments.filter((payment) => payment.id !== offlinePayment.id)] }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updatePayment: async (businessId, id, paymentData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/businesses/${businessId}/payments/${id}`, paymentData);
      const updated: PaymentType = response.data.payment || { ...paymentData, id } as PaymentType;
      await offlineSyncService.cachePayments(
        businessId,
        get().payments.map((payment: PaymentType) => (payment.id === id ? { ...payment, ...updated } : payment))
      );
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlinePayment = await offlineSyncService.updateOfflinePayment(businessId, id, paymentData);
        set((state) => ({
          payments: state.payments.map((payment) => (payment.id === id ? { ...payment, ...offlinePayment } : payment)),
          error: null,
        }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deletePayment: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/payments/${id}`);
      await offlineSyncService.cachePayments(
        businessId,
        get().payments.filter((payment: PaymentType) => payment.id !== id)
      );
      set((state) => ({
        payments: state.payments.filter((p) => p.id !== id),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.deleteOfflinePayment(businessId, id);
        set((state) => ({
          payments: state.payments.filter((payment) => payment.id !== id),
          error: null,
        }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
