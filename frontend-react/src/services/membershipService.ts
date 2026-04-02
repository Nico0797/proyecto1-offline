import api from './api';

export interface MembershipInfo {
  plan: 'free' | 'basic' | 'pro' | 'business';
  status: 'active' | 'canceled' | 'past_due' | 'inactive';
  nextBillingDate: string | null;
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'annual';
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

export interface CatalogCyclePricing {
  cycle: 'monthly' | 'quarterly' | 'annual';
  label: string;
  months: number;
  discount_percent: number;
  discount_label: string | null;
  total_usd: number;
  monthly_equivalent_usd: number;
  savings_usd: number;
  checkout_plan_code: PlanCode;
}

export interface CatalogPlanPricing {
  key: 'basic' | 'pro' | 'business';
  display_name: string;
  tagline: string;
  short_description: string;
  highlight: string;
  cta_label: string;
  badge: string | null;
  monthly_price_usd: number;
  features: string[];
  recommended_for: string[];
  cycles: Record<'monthly' | 'quarterly' | 'annual', CatalogCyclePricing>;
}

export type PlanCode =
  | 'basic_monthly'
  | 'basic_quarterly'
  | 'basic_annual'
  | 'pro_monthly'
  | 'pro_quarterly'
  | 'pro_annual'
  | 'business_monthly'
  | 'business_quarterly'
  | 'business_annual';

export interface Pricing {
  currency: string;
  display_currency: string;
  legacy_aliases: Record<string, string>;
  plan_order: Array<'basic' | 'pro' | 'business'>;
  cycle_order: Array<'monthly' | 'quarterly' | 'annual'>;
  plans: Record<'basic' | 'pro' | 'business', CatalogPlanPricing>;
  module_minimum_plan: Record<string, 'basic' | 'pro' | 'business'>;
  business_type_recommended_plan: Record<string, 'basic' | 'pro' | 'business'>;
}

export const normalizeMembershipPlan = (plan?: string | null): 'basic' | 'pro' | 'business' => {
  if (!plan || plan === 'free' || plan === 'basic') return 'basic';
  if (plan === 'business') return 'business';
  return 'pro';
};

export const getCycleKey = (cycle?: string | null): 'monthly' | 'quarterly' | 'annual' => {
  if (cycle === 'quarterly') return 'quarterly';
  if (cycle === 'annual' || cycle === 'yearly') return 'annual';
  return 'monthly';
};

export const membershipService = {
  getMembership: async (): Promise<MembershipInfo> => {
    const response = await api.get('/billing/status');
    return response.data;
  },

  getPricing: async (): Promise<Pricing> => {
      const response = await api.get('/billing/pricing');
      return response.data;
  },

  createCheckout: async (plan: PlanCode, payment_method: 'card' | 'nequi' | 'pse' | 'bancolombia' = 'card'): Promise<string> => {
      const res = await api.post('/billing/checkout', { plan, payment_method });
      const url = res.data?.checkout?.init_point || res.data?.checkout?.url;
      if (!url) {
        const err = res.data?.error || 'No se pudo generar el enlace de pago';
        throw new Error(err);
      }
      return url as string;
  },

  getPortalUrl: async (): Promise<string> => {
      const response = await api.post('/billing/portal');
      const data = response.data || {};
      const url = data.url || data.portal_url || data.redirect_url || data.link;
      if (!url || typeof url !== 'string') {
        throw new Error('Portal URL inválida');
      }
      return url;
  },

  saveNequiSource: async (phone: string, prefix: string = '+57'): Promise<{ success?: boolean; pending?: boolean; token?: string }> => {
    try {
      const res = await api.post('/billing/save-nequi-source', { phone, prefix });
      return res.data || { success: true };
    } catch (e: any) {
      const data = e?.response?.data;
      // If backend returns 202, axios throws if validateStatus not set; surface pending properly
      if (e?.response?.status === 202 && data?.pending) {
        return { pending: true, token: data.token };
      }
      throw new Error(data?.error || e?.message || 'Error al conectar Nequi');
    }
  },

  checkNequiToken: async (token: string, phone?: string): Promise<{ success?: boolean; pending?: boolean }> => {
    try {
      const res = await api.post('/billing/check-nequi-token', { token, phone });
      return res.data || { success: true };
    } catch (e: any) {
      const data = e?.response?.data;
      if (e?.response?.status === 202 && data?.pending) {
        return { pending: true };
      }
      throw new Error(data?.error || e?.message || 'Error verificando Nequi');
    }
  },

  getUpdatePaymentUrl: async (): Promise<string> => {
      const tryExtract = (data: any) => (data?.url || data?.update_url || data?.redirect_url || data?.link) as string | undefined;
      try {
        const response = await api.post('/billing/update-payment-method');
        const url = tryExtract(response.data);
        if (url && typeof url === 'string') return url;
        throw new Error('Respuesta inválida del servidor');
      } catch (e: any) {
        const backendErr = e?.response?.data;
        const parts: string[] = [];
        if (backendErr?.error) parts.push(String(backendErr.error));
        if (backendErr?.message) parts.push(String(backendErr.message));
        if (backendErr?.details) {
          const d = backendErr.details;
          parts.push(typeof d === 'string' ? d : JSON.stringify(d));
        }
        const msg = parts.join(' | ') || e?.message || 'No se pudo generar el enlace';
        throw new Error(msg);
      }
  },

  changeCycle: async (cycle: 'monthly' | 'quarterly' | 'yearly'): Promise<string> => {
    // Map yearly to annual for backend consistency
    const backendCycle = cycle === 'yearly' ? 'annual' : cycle;
    const response = await api.post('/billing/change-cycle', { cycle: backendCycle });
    const data = response.data || {};
    return data.url || data.redirect_url || '';
  },

  cancelSubscription: async (reason: string): Promise<void> => {
    await api.post('/billing/cancel', { reason });
  },

  getInvoicePdf: async (invoiceId: string): Promise<string> => {
      // Prefer direct URL if backend provides it
      const response = await api.get(`/billing/invoices/${invoiceId}/download`, { responseType: 'blob' });
      return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  }
};
