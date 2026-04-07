import { Payment, Sale } from '../types';
import api from './api';

export interface CustomerInsights {
    score: 'excellent' | 'good' | 'risk' | 'new';
    totalDebt: number;
    lastPurchaseDate?: string;
    purchaseFrequency: number; // purchases per month
    averageTicket: number;
    daysSinceLastPayment?: number;
}

export const customerInsightsService = {
    getInsights: async (businessId: number, customerId: number): Promise<CustomerInsights> => {
        try {
            // Fetch customer history
            const salesRes = await api.get(`/businesses/${businessId}/sales?customer_id=${customerId}&limit=50`);
            const paymentsRes = await api.get(`/businesses/${businessId}/payments?customer_id=${customerId}&limit=50`);
            
            const sales: Sale[] = salesRes.data.sales || [];
            const payments: Payment[] = paymentsRes.data.payments || [];

            // Calculate Debt
            const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
            
            // Calculate Score
            let score: 'excellent' | 'good' | 'risk' | 'new' = 'new';
            const now = new Date();
            
            if (sales.length > 5) {
                score = 'good';
                // Simple logic: if payments cover most sales recently
                const recentSales = sales.slice(0, 3);
                const hasDebt = recentSales.some(s => !s.paid);
                if (!hasDebt) score = 'excellent';
            }

            // Average Ticket
            const averageTicket = sales.length > 0 ? totalSales / sales.length : 0;

            // Last Activity
            const lastSale = sales.length > 0 ? sales[0].sale_date : undefined;
            
            return {
                score,
                totalDebt: 0, // Will be filled by customer object usually
                lastPurchaseDate: lastSale,
                purchaseFrequency: sales.length, 
                averageTicket,
                daysSinceLastPayment: payments.length > 0 ? Math.floor((now.getTime() - new Date(payments[0].payment_date).getTime()) / (1000 * 3600 * 24)) : undefined
            };

        } catch (error) {
            console.error("Error calculating insights", error);
            return {
                score: 'new',
                totalDebt: 0,
                purchaseFrequency: 0,
                averageTicket: 0
            };
        }
    },

    generateWhatsAppLink: (phone: string, message: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        // Default to Colombia +57 if no code
        const fullPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${fullPhone}?text=${encodedMessage}`;
    },

    generateStatementMessage: (customerName: string, debt: number, businessName: string) => {
        return `Hola ${customerName}, te escribimos de ${businessName}. Te recordamos que tienes un saldo pendiente de $${debt.toLocaleString()}. Agradecemos tu pago.`;
    }
};
