import { create } from 'zustand';
import { Invoice } from '../types';
import {
  InvoiceFilters,
  InvoicePayload,
  InvoicePaymentPayload,
  invoicesService,
} from '../services/invoicesService';
import { offlineSyncService } from '../services/offlineSyncService';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';

interface InvoiceState {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchInvoices: (businessId: number, filters?: InvoiceFilters) => Promise<void>;
  fetchInvoice: (businessId: number, invoiceId: number) => Promise<Invoice | null>;
  createInvoice: (businessId: number, payload: InvoicePayload) => Promise<Invoice>;
  updateInvoice: (businessId: number, invoiceId: number, payload: InvoicePayload) => Promise<Invoice>;
  duplicateInvoice: (businessId: number, invoiceId: number) => Promise<Invoice>;
  updateInvoiceStatus: (
    businessId: number,
    invoiceId: number,
    status: 'draft' | 'sent' | 'cancelled'
  ) => Promise<Invoice>;
  createInvoicePayment: (
    businessId: number,
    invoiceId: number,
    payload: InvoicePaymentPayload
  ) => Promise<Invoice>;
  setSelectedInvoice: (invoice: Invoice | null) => void;
}

const upsertInvoice = (invoices: Invoice[], invoice: Invoice) => {
  const exists = invoices.some((item) => item.id === invoice.id);
  if (!exists) return [invoice, ...invoices];
  return invoices.map((item) => (item.id === invoice.id ? invoice : item));
};

const normalizeInvoiceError = (error: any) =>
  error?.response?.data?.error || error?.message || 'No fue posible procesar la factura';

const isOfflineError = (error: any) => Boolean(error?.isOfflineRequestError || !error?.response);

const filterInvoicesLocally = (invoices: Invoice[], filters?: InvoiceFilters) => {
  if (!filters) return invoices;

  const search = String(filters.search || '').trim().toLowerCase();
  return invoices.filter((invoice) => {
    if (filters.status && filters.status !== 'all' && invoice.status !== filters.status) {
      return false;
    }
    if (filters.customer_id != null && Number(invoice.customer_id || 0) !== Number(filters.customer_id)) {
      return false;
    }
    if (filters.start_date && String(invoice.issue_date || '') < filters.start_date) {
      return false;
    }
    if (filters.end_date && String(invoice.issue_date || '') > filters.end_date) {
      return false;
    }
    if (search) {
      const haystack = [
        invoice.invoice_number,
        invoice.customer_name || '',
        invoice.notes || '',
        invoice.payment_method || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
};

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  selectedInvoice: null,
  loading: false,
  saving: false,
  error: null,

  fetchInvoices: async (businessId, filters) => {
    if (!isBackendCapabilitySupported('invoices')) {
      set({ invoices: [], selectedInvoice: null, loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const invoices = await invoicesService.list(businessId, filters);
      await offlineSyncService.cacheInvoices(businessId, invoices);
      set({ invoices });
    } catch (error: any) {
      if (isOfflineError(error)) {
        const invoices = filterInvoicesLocally(await offlineSyncService.getInvoicesFromLocal(businessId), filters);
        set({ invoices, error: null });
        return;
      }
      set({ error: normalizeInvoiceError(error) });
    } finally {
      set({ loading: false });
    }
  },

  fetchInvoice: async (businessId, invoiceId) => {
    if (!isBackendCapabilitySupported('invoices')) {
      set({ selectedInvoice: null, loading: false, error: null });
      return null;
    }
    set({ loading: true, error: null });
    try {
      const resolvedInvoiceId = await offlineSyncService.getMappedEntityId('invoice', businessId, invoiceId);
      const invoice = await invoicesService.get(businessId, resolvedInvoiceId);
      await offlineSyncService.cacheInvoices(
        businessId,
        [invoice, ...get().invoices.filter((entry) => entry.id !== invoice.id)]
      );
      set((state) => ({
        selectedInvoice: invoice,
        invoices: upsertInvoice(state.invoices, invoice),
      }));
      return invoice;
    } catch (error: any) {
      if (isOfflineError(error)) {
        const invoice = await offlineSyncService.getInvoiceFromLocal(businessId, invoiceId);
        if (invoice) {
          set((state) => ({
            selectedInvoice: invoice,
            invoices: upsertInvoice(state.invoices, invoice),
            error: null,
          }));
          return invoice;
        }
      }
      set({ error: normalizeInvoiceError(error) });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createInvoice: async (businessId, payload) => {
    if (!isBackendCapabilitySupported('invoices')) {
      const error = new Error('Facturas no está disponible en el backend actual');
      set({ error: error.message, saving: false });
      throw error;
    }
    set({ saving: true, error: null });
    try {
      const invoice = await invoicesService.create(businessId, payload);
      await offlineSyncService.cacheInvoices(
        businessId,
        [invoice, ...get().invoices.filter((entry) => entry.id !== invoice.id)]
      );
      set((state) => ({
        invoices: [invoice, ...state.invoices],
        selectedInvoice: invoice,
      }));
      return invoice;
    } catch (error: any) {
      if (isOfflineError(error)) {
        const invoice = await offlineSyncService.createOfflineInvoice(businessId, payload);
        set((state) => ({
          invoices: [invoice, ...state.invoices.filter((entry) => entry.id !== invoice.id)],
          selectedInvoice: invoice,
          error: null,
        }));
        return invoice;
      }
      set({ error: normalizeInvoiceError(error) });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updateInvoice: async (businessId, invoiceId, payload) => {
    if (!isBackendCapabilitySupported('invoices')) {
      const error = new Error('Facturas no está disponible en el backend actual');
      set({ error: error.message, saving: false });
      throw error;
    }
    set({ saving: true, error: null });
    try {
      const invoice = await invoicesService.update(businessId, invoiceId, payload);
      await offlineSyncService.cacheInvoices(
        businessId,
        get().invoices.map((entry) => (entry.id === invoice.id ? invoice : entry))
      );
      set((state) => ({
        invoices: upsertInvoice(state.invoices, invoice),
        selectedInvoice: invoice,
      }));
      return invoice;
    } catch (error: any) {
      if (isOfflineError(error)) {
        const invoice = await offlineSyncService.updateOfflineInvoice(businessId, invoiceId, payload);
        set((state) => ({
          invoices: upsertInvoice(state.invoices, invoice),
          selectedInvoice: invoice,
          error: null,
        }));
        return invoice;
      }
      set({ error: normalizeInvoiceError(error) });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  duplicateInvoice: async (businessId, invoiceId) => {
    if (!isBackendCapabilitySupported('invoices')) {
      const error = new Error('Facturas no está disponible en el backend actual');
      set({ error: error.message, saving: false });
      throw error;
    }
    set({ saving: true, error: null });
    try {
      const invoice = await invoicesService.duplicate(businessId, invoiceId);
      await offlineSyncService.cacheInvoices(
        businessId,
        [invoice, ...get().invoices.filter((entry) => entry.id !== invoice.id)]
      );
      set((state) => ({
        invoices: [invoice, ...state.invoices],
        selectedInvoice: invoice,
      }));
      return invoice;
    } catch (error: any) {
      set({ error: normalizeInvoiceError(error) });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updateInvoiceStatus: async (businessId, invoiceId, status) => {
    if (!isBackendCapabilitySupported('invoices')) {
      const error = new Error('Facturas no está disponible en el backend actual');
      set({ error: error.message, saving: false });
      throw error;
    }
    set({ saving: true, error: null });
    try {
      const invoice = await invoicesService.updateStatus(businessId, invoiceId, status);
      await offlineSyncService.cacheInvoices(
        businessId,
        get().invoices.map((entry) => (entry.id === invoice.id ? invoice : entry))
      );
      set((state) => ({
        invoices: upsertInvoice(state.invoices, invoice),
        selectedInvoice: state.selectedInvoice?.id === invoice.id ? invoice : state.selectedInvoice,
      }));
      return invoice;
    } catch (error: any) {
      if (isOfflineError(error)) {
        const invoice = await offlineSyncService.updateOfflineInvoiceStatus(businessId, invoiceId, status);
        set((state) => ({
          invoices: upsertInvoice(state.invoices, invoice),
          selectedInvoice: state.selectedInvoice?.id === invoiceId || state.selectedInvoice?.id === invoice.id
            ? invoice
            : state.selectedInvoice,
          error: null,
        }));
        return invoice;
      }
      set({ error: normalizeInvoiceError(error) });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  createInvoicePayment: async (businessId, invoiceId, payload) => {
    if (!isBackendCapabilitySupported('invoices')) {
      const error = new Error('Facturas no está disponible en el backend actual');
      set({ error: error.message, saving: false });
      throw error;
    }
    set({ saving: true, error: null });
    try {
      const result = await invoicesService.createPayment(businessId, invoiceId, payload);
      await offlineSyncService.cacheInvoices(
        businessId,
        get().invoices.map((entry) => (entry.id === result.invoice.id ? result.invoice : entry))
      );
      set((state) => ({
        invoices: upsertInvoice(state.invoices, result.invoice),
        selectedInvoice: result.invoice,
      }));
      return result.invoice;
    } catch (error: any) {
      if (isOfflineError(error)) {
        const invoice = await offlineSyncService.createOfflineInvoicePayment(businessId, invoiceId, payload);
        set((state) => ({
          invoices: upsertInvoice(state.invoices, invoice),
          selectedInvoice: state.selectedInvoice?.id === invoiceId || state.selectedInvoice?.id === invoice.id
            ? invoice
            : state.selectedInvoice,
          error: null,
        }));
        return invoice;
      }
      set({ error: normalizeInvoiceError(error) });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),
}));
