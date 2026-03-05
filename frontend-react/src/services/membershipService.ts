import api from './api';

export interface MembershipInfo {
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'inactive';
  nextBillingDate: string | null;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl?: string;
}

export interface Pricing {
    currency: string;
    monthly: number;
    quarterly: number;
    annual: number;
    discounts: {
        quarterly: number;
        annual: number;
    }
}

export const membershipService = {
  getMembership: async (): Promise<MembershipInfo> => {
    const response = await api.get('/billing/status');
    return response.data;
  },

  getPricing: async (): Promise<Pricing> => {
      const response = await api.get('/billing/pricing');
      return response.data;
  },

  getPortalUrl: async (): Promise<string> => {
      const response = await api.post('/billing/portal');
      return response.data.url;
  },

  getUpdatePaymentUrl: async (): Promise<string> => {
      const response = await api.post('/billing/update-payment-method');
      return response.data.url;
  },

  changeCycle: async (cycle: 'monthly' | 'quarterly' | 'yearly'): Promise<string> => {
    // Map yearly to annual for backend consistency
    const backendCycle = cycle === 'yearly' ? 'annual' : cycle;
    const response = await api.post('/billing/change-cycle', { cycle: backendCycle });
    return response.data.url;
  },

  cancelSubscription: async (reason: string): Promise<void> => {
    await api.post('/billing/cancel', { reason });
  },

  getInvoicePdf: async (invoiceId: string): Promise<string> => {
      const response = await api.get(`/billing/invoices/${invoiceId}/download`, { responseType: 'blob' });
      return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  }
};
