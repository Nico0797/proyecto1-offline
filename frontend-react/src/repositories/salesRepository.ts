import api from '../services/api';
import { offlineSyncService } from '../services/offlineSyncService';
import { hasOfflineSessionSeed } from '../services/offlineSession';
import type { Sale } from '../types';

interface FetchSalesOptions {
  includeItems?: boolean;
}

const shouldUseLocalOnly = () => !localStorage.getItem('token') && hasOfflineSessionSeed();

export const salesRepository = {
  async list(businessId: number, options?: FetchSalesOptions): Promise<Sale[]> {
    if (shouldUseLocalOnly()) {
      return offlineSyncService.getSalesFromLocal(businessId);
    }

    try {
      const includeItems = options?.includeItems ?? false;
      const response = await api.get(`/businesses/${businessId}/sales`, {
        params: { include_items: includeItems ? 'true' : 'false' },
      });
      const sales = response.data.sales || [];
      if (includeItems) {
        await offlineSyncService.cacheSales(businessId, sales);
      }
      return sales;
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        return offlineSyncService.getSalesFromLocal(businessId);
      }
      throw error;
    }
  },

  async create(businessId: number, saleData: Record<string, any>): Promise<Sale> {
    if (shouldUseLocalOnly()) {
      return offlineSyncService.createOfflineSale(businessId, saleData);
    }

    try {
      const response = await api.post(`/businesses/${businessId}/sales`, saleData);
      return response.data.sale;
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        return offlineSyncService.createOfflineSale(businessId, saleData);
      }
      throw error;
    }
  },

  async update(businessId: number, saleId: number, saleData: Partial<Sale>): Promise<Sale> {
    if (shouldUseLocalOnly()) {
      return offlineSyncService.updateOfflineSale(businessId, saleId, saleData);
    }

    try {
      const response = await api.put(`/businesses/${businessId}/sales/${saleId}`, saleData);
      return response.data.sale || ({ ...saleData, id: saleId, business_id: businessId } as Sale);
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        return offlineSyncService.updateOfflineSale(businessId, saleId, saleData);
      }
      throw error;
    }
  },

  async remove(businessId: number, saleId: number): Promise<void> {
    if (shouldUseLocalOnly()) {
      await offlineSyncService.deleteOfflineSale(businessId, saleId);
      return;
    }

    try {
      await api.delete(`/businesses/${businessId}/sales/${saleId}`);
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.deleteOfflineSale(businessId, saleId);
        return;
      }
      throw error;
    }
  },
};
