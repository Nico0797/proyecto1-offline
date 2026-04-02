import api from './api';
import {
  Invoice,
  InvoiceCustomerStatement,
  InvoicePayment,
  InvoiceReceivable,
  InvoiceReceivableFilterStatus,
  InvoiceReceivablesOverview,
  InvoiceSettings,
  InvoiceStatus,
} from '../types';

export interface InvoiceFilters {
  status?: InvoiceStatus | 'all';
  search?: string;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface InvoiceReceivablesFilters {
  status?: InvoiceReceivableFilterStatus;
  search?: string;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface InvoicePayloadItem {
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  sort_order?: number;
}

export interface InvoicePayload {
  customer_id?: number | null;
  issue_date: string;
  due_date?: string | null;
  status?: 'draft' | 'sent' | 'cancelled';
  currency?: string;
  notes?: string | null;
  payment_method?: string | null;
  items: InvoicePayloadItem[];
}

export interface InvoicePaymentPayload {
  amount?: number;
  payment_date?: string;
  payment_method?: string;
  treasury_account_id?: number | null;
  note?: string;
}

export interface InvoicePaymentAdjustmentPayload {
  amount?: number;
  payment_date?: string;
  payment_method?: string;
  treasury_account_id?: number | null;
  note?: string;
}

const normalizeFilters = (filters?: InvoiceFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.customer_id) params.customer_id = filters.customer_id;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  return params;
};

const normalizeReceivablesFilters = (filters?: InvoiceReceivablesFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.customer_id) params.customer_id = filters.customer_id;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  return params;
};

export const invoicesService = {
  async list(businessId: number, filters?: InvoiceFilters): Promise<Invoice[]> {
    const response = await api.get(`/businesses/${businessId}/invoices`, {
      params: normalizeFilters(filters),
    });
    return response.data?.invoices || [];
  },

  async get(businessId: number, invoiceId: number): Promise<Invoice> {
    const response = await api.get(`/businesses/${businessId}/invoices/${invoiceId}`);
    return response.data.invoice;
  },

  async create(businessId: number, payload: InvoicePayload): Promise<Invoice> {
    const response = await api.post(`/businesses/${businessId}/invoices`, payload);
    return response.data.invoice;
  },

  async update(businessId: number, invoiceId: number, payload: InvoicePayload): Promise<Invoice> {
    const response = await api.put(`/businesses/${businessId}/invoices/${invoiceId}`, payload);
    return response.data.invoice;
  },

  async duplicate(businessId: number, invoiceId: number): Promise<Invoice> {
    const response = await api.post(`/businesses/${businessId}/invoices/${invoiceId}/duplicate`);
    return response.data.invoice;
  },

  async updateStatus(
    businessId: number,
    invoiceId: number,
    status: 'draft' | 'sent' | 'cancelled'
  ): Promise<Invoice> {
    const response = await api.post(`/businesses/${businessId}/invoices/${invoiceId}/status`, { status });
    return response.data.invoice;
  },

  async createPayment(
    businessId: number,
    invoiceId: number,
    payload: InvoicePaymentPayload
  ): Promise<{ invoice: Invoice; payment: InvoicePayment }> {
    const response = await api.post(`/businesses/${businessId}/invoices/${invoiceId}/payments`, payload);
    return {
      invoice: response.data.invoice,
      payment: response.data.payment,
    };
  },

  async reversePayment(
    businessId: number,
    invoiceId: number,
    paymentId: number,
    payload: InvoicePaymentAdjustmentPayload
  ): Promise<{ invoice: Invoice; payment: InvoicePayment }> {
    const response = await api.post(`/businesses/${businessId}/invoices/${invoiceId}/payments/${paymentId}/reverse`, payload);
    return {
      invoice: response.data.invoice,
      payment: response.data.payment,
    };
  },

  async refundPayment(
    businessId: number,
    invoiceId: number,
    paymentId: number,
    payload: InvoicePaymentAdjustmentPayload
  ): Promise<{ invoice: Invoice; payment: InvoicePayment }> {
    const response = await api.post(`/businesses/${businessId}/invoices/${invoiceId}/payments/${paymentId}/refund`, payload);
    return {
      invoice: response.data.invoice,
      payment: response.data.payment,
    };
  },

  async getSettings(businessId: number): Promise<InvoiceSettings> {
    const response = await api.get(`/businesses/${businessId}/invoice-settings`);
    return response.data.settings;
  },

  async updateSettings(businessId: number, payload: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
    const response = await api.put(`/businesses/${businessId}/invoice-settings`, payload);
    return response.data.settings;
  },

  async getPrintableHtml(businessId: number, invoiceId: number): Promise<string> {
    const response = await api.get(`/businesses/${businessId}/invoices/${invoiceId}/print`, {
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    return typeof response.data === 'string' ? response.data : String(response.data || '');
  },

  getPdfDownloadPath(businessId: number, invoiceId: number): string {
    return `/businesses/${businessId}/invoices/${invoiceId}/pdf`;
  },

  async getWhatsAppShare(businessId: number, invoiceId: number): Promise<{ message: string; phone?: string | null }> {
    const response = await api.get(`/businesses/${businessId}/invoices/${invoiceId}/share/whatsapp`);
    return {
      message: response.data?.message || '',
      phone: response.data?.phone || null,
    };
  },

  async getReminderShare(
    businessId: number,
    invoiceId: number
  ): Promise<{ message: string; phone?: string | null; invoice?: InvoiceReceivable | null }> {
    const response = await api.get(`/businesses/${businessId}/invoices/${invoiceId}/share/reminder`);
    return {
      message: response.data?.message || '',
      phone: response.data?.phone || null,
      invoice: response.data?.invoice || null,
    };
  },

  async getReceivables(
    businessId: number,
    filters?: InvoiceReceivablesFilters
  ): Promise<InvoiceReceivablesOverview> {
    const response = await api.get(`/businesses/${businessId}/invoice-receivables`, {
      params: normalizeReceivablesFilters(filters),
    });
    return {
      summary: response.data?.summary || {
        total_outstanding: 0,
        overdue_total: 0,
        due_today_total: 0,
        due_soon_total: 0,
        current_total: 0,
        invoiced_total: 0,
        amount_collected_in_range: 0,
        gross_collected_in_range: 0,
        refunded_total_in_range: 0,
        reversed_total_in_range: 0,
        collection_rate: 0,
        average_days_to_collect: null,
        customer_count: 0,
        unpaid_invoice_count: 0,
        overdue_invoice_count: 0,
        partial_invoice_count: 0,
        total_invoice_count: 0,
      },
      customers: response.data?.customers || [],
      receivables: response.data?.receivables || [],
    };
  },

  async getCustomerStatement(
    businessId: number,
    customerId: number,
    filters?: Pick<InvoiceReceivablesFilters, 'start_date' | 'end_date'>
  ): Promise<InvoiceCustomerStatement> {
    const response = await api.get(
      `/businesses/${businessId}/invoice-receivables/customers/${customerId}/statement`,
      { params: normalizeReceivablesFilters(filters) }
    );
    return response.data;
  },

  async getCustomerStatementPrintableHtml(
    businessId: number,
    customerId: number,
    filters?: Pick<InvoiceReceivablesFilters, 'start_date' | 'end_date'>
  ): Promise<string> {
    const response = await api.get(
      `/businesses/${businessId}/invoice-receivables/customers/${customerId}/statement/print`,
      {
        params: normalizeReceivablesFilters(filters),
        responseType: 'text',
        transformResponse: [(data) => data],
      }
    );
    return typeof response.data === 'string' ? response.data : String(response.data || '');
  },

  async getCustomerStatementWhatsAppShare(
    businessId: number,
    customerId: number,
    filters?: Pick<InvoiceReceivablesFilters, 'start_date' | 'end_date'>
  ): Promise<{ message: string; phone?: string | null; statement?: InvoiceCustomerStatement | null }> {
    const response = await api.get(
      `/businesses/${businessId}/invoice-receivables/customers/${customerId}/statement/share/whatsapp`,
      { params: normalizeReceivablesFilters(filters) }
    );
    return {
      message: response.data?.message || '',
      phone: response.data?.phone || null,
      statement: response.data?.statement || null,
    };
  },
};
