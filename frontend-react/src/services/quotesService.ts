import api from './api';
import { Quote, QuoteStatus } from '../types';

export interface QuoteFilters {
  status?: QuoteStatus | 'all';
  search?: string;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface QuotePayloadItem {
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order?: number;
}

export interface QuotePayload {
  customer_id?: number | null;
  issue_date: string;
  expiry_date?: string | null;
  status?: QuoteStatus;
  discount?: number;
  notes?: string | null;
  terms?: string | null;
  items: QuotePayloadItem[];
}

export interface QuoteConvertPayload {
  sale_date?: string;
  payment_method?: string;
  paid?: boolean;
  amount_paid?: number;
  note?: string;
}

const normalizeFilters = (filters?: QuoteFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.customer_id) params.customer_id = filters.customer_id;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  return params;
};

export const quotesService = {
  async list(businessId: number, filters?: QuoteFilters): Promise<Quote[]> {
    const response = await api.get(`/businesses/${businessId}/quotes`, {
      params: normalizeFilters(filters),
    });
    return response.data?.quotes || [];
  },

  async get(businessId: number, quoteId: number): Promise<Quote> {
    const response = await api.get(`/businesses/${businessId}/quotes/${quoteId}`);
    return response.data.quote;
  },

  async create(businessId: number, payload: QuotePayload): Promise<Quote> {
    const response = await api.post(`/businesses/${businessId}/quotes`, payload);
    return response.data.quote;
  },

  async update(businessId: number, quoteId: number, payload: QuotePayload): Promise<Quote> {
    const response = await api.put(`/businesses/${businessId}/quotes/${quoteId}`, payload);
    return response.data.quote;
  },

  async remove(businessId: number, quoteId: number): Promise<void> {
    await api.delete(`/businesses/${businessId}/quotes/${quoteId}`);
  },

  async updateStatus(businessId: number, quoteId: number, status: QuoteStatus): Promise<Quote> {
    const response = await api.post(`/businesses/${businessId}/quotes/${quoteId}/status`, { status });
    return response.data.quote;
  },

  async convertToSale(businessId: number, quoteId: number, payload: QuoteConvertPayload): Promise<{ quote: Quote; sale: any }> {
    const response = await api.post(`/businesses/${businessId}/quotes/${quoteId}/convert-to-sale`, payload);
    return {
      quote: response.data.quote,
      sale: response.data.sale,
    };
  },

  async getPrintableHtml(businessId: number, quoteId: number): Promise<string> {
    const response = await api.get(`/businesses/${businessId}/quotes/${quoteId}/print`, {
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    return typeof response.data === 'string' ? response.data : String(response.data || '');
  },

  getPdfDownloadPath(businessId: number, quoteId: number): string {
    return `/businesses/${businessId}/quotes/${quoteId}/pdf`;
  },
};
