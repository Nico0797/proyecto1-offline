import api from './api';
import { Supplier } from '../types';

export interface SupplierFilters {
  search?: string;
  include_inactive?: boolean;
}

export interface SupplierPayload {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

const normalizeFilters = (filters?: SupplierFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.include_inactive) params.include_inactive = true;
  return params;
};

export const supplierService = {
  async list(businessId: number, filters?: SupplierFilters): Promise<Supplier[]> {
    const response = await api.get(`/businesses/${businessId}/suppliers`, {
      params: normalizeFilters(filters),
    });
    return response.data?.suppliers || [];
  },

  async get(businessId: number, supplierId: number): Promise<Supplier> {
    const response = await api.get(`/businesses/${businessId}/suppliers/${supplierId}`);
    return response.data.supplier;
  },

  async create(businessId: number, payload: SupplierPayload): Promise<Supplier> {
    const response = await api.post(`/businesses/${businessId}/suppliers`, payload);
    return response.data.supplier;
  },

  async update(businessId: number, supplierId: number, payload: SupplierPayload): Promise<Supplier> {
    const response = await api.put(`/businesses/${businessId}/suppliers/${supplierId}`, payload);
    return response.data.supplier;
  },

  async deactivate(businessId: number, supplierId: number): Promise<Supplier> {
    const response = await api.delete(`/businesses/${businessId}/suppliers/${supplierId}`);
    return response.data.supplier;
  },
};
