import api from './api';
import { SupplierPayable, SupplierPayment, SupplierPayablesSupplierSummary, Supplier } from '../types';

export interface SupplierPayableFilters {
  status?: 'pending' | 'partial' | 'paid';
  supplier_id?: number;
  search?: string;
}

export interface SupplierPaymentPayload {
  amount: number;
  payment_date: string;
  method?: string | null;
  treasury_account_id?: number | null;
  reference?: string | null;
  notes?: string | null;
}

export interface SupplierPayablesListResponse {
  supplier_payables: SupplierPayable[];
  suppliers_summary: SupplierPayablesSupplierSummary[];
}

export interface SupplierPayableDetailResponse {
  supplier_payable: SupplierPayable;
}

export interface SupplierPayablePaymentsResponse {
  supplier_payable: SupplierPayable;
  payments: SupplierPayment[];
}

export interface SupplierPayablesBySupplierResponse {
  supplier: Supplier;
  supplier_payables: SupplierPayable[];
  summary: SupplierPayablesSupplierSummary;
}

const normalizeFilters = (filters?: SupplierPayableFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.status) params.status = filters.status;
  if (filters.supplier_id) params.supplier_id = filters.supplier_id;
  if (filters.search) params.search = filters.search;
  return params;
};

export const supplierPayablesService = {
  async list(businessId: number, filters?: SupplierPayableFilters): Promise<SupplierPayablesListResponse> {
    const response = await api.get(`/businesses/${businessId}/supplier-payables`, {
      params: normalizeFilters(filters),
    });
    return {
      supplier_payables: response.data?.supplier_payables || [],
      suppliers_summary: response.data?.suppliers_summary || [],
    };
  },

  async get(businessId: number, payableId: number): Promise<SupplierPayable> {
    const response = await api.get(`/businesses/${businessId}/supplier-payables/${payableId}`);
    return response.data.supplier_payable;
  },

  async getBySupplier(businessId: number, supplierId: number, status?: 'pending' | 'partial' | 'paid'): Promise<SupplierPayablesBySupplierResponse> {
    const params = status ? { status } : undefined;
    const response = await api.get(`/businesses/${businessId}/suppliers/${supplierId}/payables`, { params });
    return response.data;
  },

  async listPayments(businessId: number, payableId: number): Promise<SupplierPayablePaymentsResponse> {
    const response = await api.get(`/businesses/${businessId}/supplier-payables/${payableId}/payments`);
    return {
      supplier_payable: response.data.supplier_payable,
      payments: response.data.payments || [],
    };
  },

  async addPayment(businessId: number, payableId: number, payload: SupplierPaymentPayload): Promise<{ payment: SupplierPayment; supplier_payable: SupplierPayable }> {
    const response = await api.post(`/businesses/${businessId}/supplier-payables/${payableId}/payments`, payload);
    return {
      payment: response.data.payment,
      supplier_payable: response.data.supplier_payable,
    };
  },
};
