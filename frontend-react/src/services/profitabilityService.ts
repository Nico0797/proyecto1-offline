import api from './api';
import {
  ProfitabilityAlertsResponse,
  ProfitabilityProductsResponse,
  ProfitabilitySalesResponse,
  ProfitabilitySummary,
} from '../types';

export interface ProfitabilityQueryParams {
  start_date?: string;
  end_date?: string;
  status?: string;
  product_query?: string;
  focus?: string;
}

export interface ProfitabilityRequestOptions {
  silenceNotFound?: boolean;
}

export const createEmptyProfitabilityAlertsResponse = (): ProfitabilityAlertsResponse => ({
  alerts: [],
  missing_cost_products_count: 0,
  incomplete_products_count: 0,
  no_consumption_products_count: 0,
  incomplete_sales_count: 0,
  no_consumption_sales_count: 0,
  missing_cost_sales_count: 0,
  products: [],
  sales: [],
});

export const profitabilityService = {
  async getSummary(businessId: number, params: ProfitabilityQueryParams = {}, options?: ProfitabilityRequestOptions): Promise<ProfitabilitySummary> {
    const response = await api.get(`/businesses/${businessId}/profitability/summary`, {
      params,
      __silent403: Boolean(options?.silenceNotFound),
      __silent404: Boolean(options?.silenceNotFound),
    } as any);
    return response.data;
  },

  async getProducts(businessId: number, params: ProfitabilityQueryParams = {}): Promise<ProfitabilityProductsResponse> {
    const response = await api.get(`/businesses/${businessId}/profitability/products`, { params });
    return response.data;
  },

  async getSales(businessId: number, params: ProfitabilityQueryParams = {}): Promise<ProfitabilitySalesResponse> {
    const response = await api.get(`/businesses/${businessId}/profitability/sales`, { params });
    return response.data;
  },

  async getAlerts(businessId: number, params: ProfitabilityQueryParams = {}): Promise<ProfitabilityAlertsResponse> {
    const response = await api.get(`/businesses/${businessId}/profitability/alerts`, { params });
    return response.data;
  },

  async downloadExport(businessId: number, params: ProfitabilityQueryParams = {}): Promise<Blob> {
    const response = await api.get(`/businesses/${businessId}/export/profitability`, {
      params: { ...params, direct: '1' },
      responseType: 'blob',
    });
    return response.data;
  },
};
