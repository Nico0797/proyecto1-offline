import api from './api';
import { RawPurchase, RawPurchaseItem, RawPurchaseStatus } from '../types';

export interface RawPurchaseFilters {
  status?: RawPurchaseStatus;
  search?: string;
  supplier_id?: number;
}

export interface RawPurchaseItemPayload {
  raw_material_id: number;
  description?: string | null;
  quantity: number;
  unit_cost: number;
}

export interface RawPurchasePayload {
  supplier_id?: number | null;
  purchase_number?: string | null;
  purchase_date: string;
  notes?: string | null;
  items: RawPurchaseItemPayload[];
}

const normalizeFilters = (filters?: RawPurchaseFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.supplier_id) params.supplier_id = filters.supplier_id;
  return params;
};

export const rawPurchasesService = {
  async list(businessId: number, filters?: RawPurchaseFilters): Promise<RawPurchase[]> {
    const response = await api.get(`/businesses/${businessId}/raw-purchases`, {
      params: normalizeFilters(filters),
    });
    return response.data?.raw_purchases || [];
  },

  async get(businessId: number, purchaseId: number): Promise<RawPurchase> {
    const response = await api.get(`/businesses/${businessId}/raw-purchases/${purchaseId}`);
    return response.data.raw_purchase;
  },

  async create(businessId: number, payload: RawPurchasePayload): Promise<RawPurchase> {
    const response = await api.post(`/businesses/${businessId}/raw-purchases`, payload);
    return response.data.raw_purchase;
  },

  async update(businessId: number, purchaseId: number, payload: RawPurchasePayload): Promise<RawPurchase> {
    const response = await api.put(`/businesses/${businessId}/raw-purchases/${purchaseId}`, payload);
    return response.data.raw_purchase;
  },

  async confirm(
    businessId: number,
    purchaseId: number,
    payload?: { financial_flow?: 'cash' | 'payable'; payment_method?: string | null; treasury_account_id?: number | null }
  ): Promise<RawPurchase> {
    const response = await api.post(`/businesses/${businessId}/raw-purchases/${purchaseId}/confirm`, payload);
    return response.data.raw_purchase;
  },

  async cancel(businessId: number, purchaseId: number): Promise<RawPurchase> {
    const response = await api.delete(`/businesses/${businessId}/raw-purchases/${purchaseId}`);
    return response.data.raw_purchase;
  },
};

export const calcRawPurchaseItemSubtotal = (item: Pick<RawPurchaseItem, 'quantity' | 'unit_cost'> | Pick<RawPurchaseItemPayload, 'quantity' | 'unit_cost'>) => {
  return Number(((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)).toFixed(4));
};
