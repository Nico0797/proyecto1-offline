import { create } from 'zustand';
import type { Customer } from '../types';
import { customerRepository } from '../repositories/customerRepository';

interface CustomerState {
  customers: Customer[];
  debtTermDays: number;
  loading: boolean;
  error: string | null;
  fetchCustomers: (businessId: number) => Promise<void>;
  addCustomer: (businessId: number, customerData: Partial<Customer>) => Promise<void>;
  updateCustomer: (businessId: number, id: number, customerData: Partial<Customer>) => Promise<void>;
  deleteCustomer: (businessId: number, id: number) => Promise<void>;
  setDebtTermDays: (days: number) => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  debtTermDays: 30,
  loading: false,
  error: null,
  fetchCustomers: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const localState = await customerRepository.list(businessId);
      set({
        customers: localState.customers,
        debtTermDays: localState.debtTermDays || 30,
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
      await customerRepository.create(businessId, customer);
      await get().fetchCustomers(businessId);
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateCustomer: async (businessId, id, updates) => {
    set({ loading: true, error: null });
    try {
      await customerRepository.update(businessId, id, updates);
      await get().fetchCustomers(businessId);
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteCustomer: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await customerRepository.remove(businessId, id);
      set((state) => ({
        customers: state.customers.filter((customer) => customer.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  setDebtTermDays: (days: number) => set({ debtTermDays: days }),
}));
