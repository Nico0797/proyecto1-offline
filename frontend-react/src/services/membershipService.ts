export interface MembershipInfo {
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due';
  nextBillingDate: string;
  billingCycle: 'monthly' | 'yearly';
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

// Mock service - in production this would call your backend which talks to Wompi/Stripe
export const membershipService = {
  getMembership: async (): Promise<MembershipInfo> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      plan: 'pro',
      status: 'active',
      nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      billingCycle: 'monthly',
      paymentMethod: {
        brand: 'VISA',
        last4: '4242',
        expMonth: 12,
        expYear: 2025
      },
      invoices: [
        { id: 'inv_123', date: new Date().toISOString(), amount: 29000, status: 'paid', pdfUrl: '#' },
        { id: 'inv_122', date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), amount: 29000, status: 'paid', pdfUrl: '#' },
        { id: 'inv_121', date: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString(), amount: 29000, status: 'paid', pdfUrl: '#' },
      ]
    };
  },

  changeCycle: async (cycle: 'monthly' | 'yearly'): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Call backend to update subscription
    console.log('Cycle changed to:', cycle);
  },

  cancelSubscription: async (reason: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Call backend to cancel
    console.log('Subscription canceled:', reason);
  },

  getInvoicePdf: async (invoiceId: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Return mock PDF url or trigger download
    return `https://example.com/invoices/${invoiceId}.pdf`;
  }
};
