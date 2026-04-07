import api from './api';
import { ReceivablesOverview, ReceivableItem } from '../types';
import { offlineSyncService } from './offlineSyncService';

export const receivablesService = {
  getOverview: async (businessId: number, customerId?: number) => {
    try {
      const response = await api.get<ReceivablesOverview>(`/businesses/${businessId}/receivables/overview`, {
        params: customerId ? { customer_id: customerId } : undefined,
      });
      return response.data;
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const overview = await offlineSyncService.buildReceivablesOverviewFromLocal(businessId);
        if (customerId == null) {
          return overview;
        }

        return {
          ...overview,
          customers: overview.customers.filter((customer) => customer.customer_id === customerId),
          receivables: overview.receivables.filter((item) => item.customer_id === customerId),
        };
      }

      throw error;
    }
  },

  updateTerm: async (businessId: number, saleId: number, termDays: number) => {
    const response = await api.put<{ sale_id: number; term_days: number; receivable?: ReceivableItem | null }>(
      `/businesses/${businessId}/receivables/${saleId}/term`,
      { term_days: termDays }
    );
    return response.data;
  },
};
