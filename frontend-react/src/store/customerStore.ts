import { create } from 'zustand';
import api from '../services/api';
import type { Customer, InvoiceReceivablesOverview, ReceivablesOverview } from '../types';
import { isBusinessModuleEnabled } from '../types';
import { receivablesService } from '../services/receivablesService';
import { offlineSyncService } from '../services/offlineSyncService';
import { invoicesService } from '../services/invoicesService';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';

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
    const token = localStorage.getItem('token');
    if (!token) {
      set({ customers: [], loading: false });
      return;
    }

    // Get auth and access state for gating
    const { getAccessSnapshot } = await import('../hooks/useAccess');
    const accessStore = getAccessSnapshot();
    
    // Check if user can access customers module
    if (!accessStore.hasModule('customers') || !accessStore.hasPermission('customers.view')) {
      set({ customers: [], loading: false, error: null });
      return;
    }

    set({ loading: true, error: null });
    try {
      const [bizRes, allRes] = await Promise.all([
        api.get(`/businesses/${businessId}`),
        api.get(`/businesses/${businessId}/customers`),
      ]);

      const canUseReceivables = isBusinessModuleEnabled(
        bizRes.data?.business?.modules,
        'accounts_receivable'
      );
      
      // Only fetch debtors if accounts_receivable module is enabled
      let debtorsRes: ReceivablesOverview = { customers: [], receivables: [], summary: { total_pending: 0, customers_with_balance: 0, open_count: 0, overdue_total: 0, due_soon_total: 0, due_today_total: 0, current_total: 0 }, settings: { default_term_days: 30, due_soon_days: 7 } };
      let invoiceReceivablesRes: InvoiceReceivablesOverview = {
        summary: {
          total_outstanding: 0,
          overdue_total: 0,
          due_today_total: 0,
          due_soon_total: 0,
          current_total: 0,
          invoiced_total: 0,
          amount_collected_in_range: 0,
          collection_rate: 0,
          average_days_to_collect: null,
          customer_count: 0,
          unpaid_invoice_count: 0,
          overdue_invoice_count: 0,
          partial_invoice_count: 0,
          total_invoice_count: 0,
        },
        customers: [],
        receivables: [],
      };
      if (canUseReceivables && accessStore.hasModule('accounts_receivable') && accessStore.hasPermission('receivables.view')) {
        try {
          const receivablesRequests: Array<Promise<void>> = [
            receivablesService.getOverview(businessId).then((overview) => {
              debtorsRes = overview;
            }),
          ];
          if (accessStore.hasModule('sales') && accessStore.hasPermission('invoices.view') && isBackendCapabilitySupported('invoices')) {
            receivablesRequests.push(
              invoicesService.getReceivables(businessId).then((overview) => {
                invoiceReceivablesRes = overview;
              })
            );
          }
          await Promise.all(receivablesRequests);
        } catch (error) {
          console.warn("Could not fetch debtors overview:", error);
          // Continue with empty debtors
        }
      }

      const savedTermDays = bizRes.data?.business?.settings?.debt_term_days;
      const termDays = typeof savedTermDays === 'number' && savedTermDays >= 0
        ? savedTermDays
        : debtorsRes.settings?.default_term_days || 30;

      const all: Customer[] = allRes.data.customers || [];
      const debtorSummaries = debtorsRes.customers || [];
      const invoiceSummaries = invoiceReceivablesRes.customers || [];

      await offlineSyncService.cacheBusiness(bizRes.data.business);
      await offlineSyncService.cacheCustomers(businessId, all);

      const balanceMap = new Map<number, (typeof debtorSummaries)[number]>(
        debtorSummaries.map((d) => [d.customer_id, d])
      );
      const invoiceBalanceMap = new Map<number, (typeof invoiceSummaries)[number]>(
        invoiceSummaries.map((d) => [d.customer_id, d])
      );

      const merged: Customer[] = all.map(c => {
        const balanceInfo = balanceMap.get(c.id);
        const invoiceBalanceInfo = invoiceBalanceMap.get(c.id);
        const salesBalance = balanceInfo?.total_balance || 0;
        const invoiceBalance = invoiceBalanceInfo?.total_balance || 0;
        const combinedBalance = salesBalance + invoiceBalance;
        const dueDateCandidates = [balanceInfo?.nearest_due_date, invoiceBalanceInfo?.nearest_due_date].filter(Boolean) as string[];
        const dueDate = dueDateCandidates.length > 0 ? [...dueDateCandidates].sort()[0] : undefined;
        const daysUntilDue = dueDate
          ? Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : undefined;
        const daysOverdue = Math.max(balanceInfo?.max_days_overdue || 0, invoiceBalanceInfo?.max_days_overdue || 0);
        const overdueBalance = (balanceInfo?.overdue_balance || 0) + (invoiceBalanceInfo?.overdue_balance || 0);
        const dueSoonBalance = (balanceInfo?.due_soon_balance || 0) + (invoiceBalanceInfo?.due_soon_balance || 0);
        const dueTodayBalance = (balanceInfo?.due_today_balance || 0) + (invoiceBalanceInfo?.due_today_balance || 0);
        const currentBalance = (balanceInfo?.current_balance || 0) + (invoiceBalanceInfo?.current_balance || 0);
        const receivableStatus = overdueBalance > 0
          ? 'overdue'
          : dueTodayBalance > 0
            ? 'due_today'
            : dueSoonBalance > 0
              ? 'due_soon'
              : combinedBalance > 0
                ? 'current'
                : undefined;
        const receivableStatusLabel = receivableStatus === 'overdue'
          ? 'Vencida'
          : receivableStatus === 'due_today'
            ? 'Vence hoy'
            : receivableStatus === 'due_soon'
              ? 'Por vencer'
              : receivableStatus === 'current'
                ? 'Al día'
                : undefined;

        return {
          id: c.id,
          business_id: c.business_id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          email: c.email,
          notes: c.notes,
          created_at: c.created_at,
          balance: combinedBalance,
          sales_balance: salesBalance,
          invoice_balance: invoiceBalance,
          total_balance: combinedBalance,
          oldest_due_date: balanceInfo?.oldest_base_date || undefined,
          days_since_oldest: daysOverdue,
          is_overdue: receivableStatus === 'overdue',
          receivable_status: receivableStatus,
          receivable_status_label: receivableStatusLabel,
          receivable_due_date: dueDate || undefined,
          receivable_term_days: dueDate ? termDays : undefined,
          receivable_days_until_due: daysUntilDue,
          receivable_days_overdue: daysOverdue,
          overdue_balance: overdueBalance,
          due_soon_balance: dueSoonBalance,
          due_today_balance: dueTodayBalance,
          current_balance: currentBalance,
          receivable_invoice_count: (balanceInfo?.invoice_count || 0) + (invoiceBalanceInfo?.invoice_count || 0),
          sales_receivable_count: balanceInfo?.invoice_count || 0,
          invoice_receivable_count: invoiceBalanceInfo?.invoice_count || 0,
        };
      });

      await offlineSyncService.cacheCustomers(businessId, merged);

      const localState = await offlineSyncService.getOfflineMergedCustomers(businessId);
      set({
        customers: merged,
        debtTermDays: localState.debtTermDays || termDays,
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const localState = await offlineSyncService.getOfflineMergedCustomers(businessId);
        set({
          customers: localState.customers,
          debtTermDays: localState.debtTermDays,
          error: null,
        });
        return;
      }

      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addCustomer: async (businessId: number, customer: Partial<Customer>) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/customers`, customer);
      if (!response.data?.customer) {
        const validationError = new Error(response.data?.error || 'No se pudo crear el cliente') as Error & { response?: { data?: Record<string, any> } };
        validationError.response = { data: response.data };
        throw validationError;
      }

      await get().fetchCustomers(businessId);
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineCustomer = await offlineSyncService.createOfflineCustomer(businessId, customer as Record<string, any>);
        const localState = await offlineSyncService.getOfflineMergedCustomers(businessId);
        set({
          customers: localState.customers.length > 0
            ? localState.customers
            : [...get().customers.filter((item) => item.id !== offlineCustomer.id), offlineCustomer],
          debtTermDays: localState.debtTermDays || get().debtTermDays,
          error: null,
        });
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateCustomer: async (businessId: number, id: number, updates: Partial<Customer>) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/businesses/${businessId}/customers/${id}`, updates);
      if (!response.data?.customer) {
        const validationError = new Error(response.data?.error || 'No se pudo actualizar el cliente') as Error & { response?: { data?: Record<string, any> } };
        validationError.response = { data: response.data };
        throw validationError;
      }
      await get().fetchCustomers(businessId);
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.updateOfflineCustomer(businessId, id, updates as Record<string, any>);
        const localState = await offlineSyncService.getOfflineMergedCustomers(businessId);
        set({
          customers: localState.customers,
          debtTermDays: localState.debtTermDays || get().debtTermDays,
          error: null,
        });
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteCustomer: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.delete(`/businesses/${businessId}/customers/${id}`);
      if (!response.data?.ok) {
        const validationError = new Error(response.data?.error || 'No se pudo eliminar el cliente') as Error & { response?: { data?: Record<string, any> } };
        validationError.response = { data: response.data };
        throw validationError;
      }
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.deleteOfflineCustomer(businessId, id);
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
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
  setDebtTermDays: (days: number) => set({ debtTermDays: days }),
}));
