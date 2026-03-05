import { create } from 'zustand';
import api from '../services/api';
import { Customer } from '../types';

interface CustomerState {
  customers: Customer[];
  debtTermDays: number;
  loading: boolean;
  error: string | null;
  fetchCustomers: (businessId: number) => Promise<void>;
  addCustomer: (businessId: number, customer: Omit<Customer, 'id' | 'business_id' | 'created_at' | 'balance'>) => Promise<void>;
  updateCustomer: (businessId: number, id: number, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (businessId: number, id: number) => Promise<void>;
  setDebtTermDays: (days: number) => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  debtTermDays: 30,
  loading: false,
  error: null,
  fetchCustomers: async (businessId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ customers: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const [bizRes, allRes, debtorsRes] = await Promise.all([
        api.get(`/businesses/${businessId}`),
        api.get(`/businesses/${businessId}/customers`),
        api.get(`/businesses/${businessId}/customers/debtors`),
      ]);

      const savedTermDays = bizRes.data?.business?.settings?.debt_term_days;
      const overrides = bizRes.data?.business?.settings?.debt_overrides || {};
      const termDays = typeof savedTermDays === 'number' && savedTermDays > 0 ? savedTermDays : 30;

      const all: any[] = allRes.data.customers || [];
      const debtors: any[] = debtorsRes.data.debtors || [];

      const balanceMap = new Map<number, { balance: number; since?: string }>(
        debtors.map(d => [d.id, { balance: d.balance, since: d.since }])
      );

      const merged = all.map(c => {
        const balanceInfo = balanceMap.get(c.id);
        const sinceStr = balanceInfo?.since;
        const daysSince = sinceStr
          ? Math.max(
              0,
              Math.floor(
                (new Date().getTime() - new Date(sinceStr).getTime()) / (1000 * 60 * 60 * 24)
              )
            )
          : 0;

        const ov = overrides?.[String(c.id)] || overrides?.[c.id];
        const graceUntilStr: string | undefined = ov?.grace_until;
        const todayStr = new Date().toISOString().split('T')[0];
        const inGrace =
          graceUntilStr && new Date(todayStr) <= new Date(graceUntilStr);

        const isOverdueCalc = sinceStr ? daysSince > termDays : false;
        const isOverdue = inGrace ? false : isOverdueCalc;

        return {
        id: c.id,
        business_id: c.business_id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        created_at: c.created_at,
          balance: balanceInfo?.balance || 0,
          oldest_due_date: sinceStr,
          days_since_oldest: daysSince,
          is_overdue: isOverdue,
        };
      });

      set({
        customers: merged,
        debtTermDays: termDays,
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addCustomer: async (businessId, customer) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/customers`, customer);
      // If server returns the new customer, add it directly to state
      if (response.data.customer) {
        set(state => ({
            customers: [...state.customers, { ...response.data.customer, balance: 0 }]
        }));
      } else {
          // Fallback
          await get().fetchCustomers(businessId);
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateCustomer: async (businessId, id, updates) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/businesses/${businessId}/customers/${id}`, updates);
      await get().fetchCustomers(businessId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteCustomer: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/customers/${id}`);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  setDebtTermDays: (days) => set({ debtTermDays: days }),
}));
