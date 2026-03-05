import api from './api';

export type PeriodType = 'daily' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface BalanceSummary {
    income: number;
    expenses: number;
    profit: number;
    margin: number;
    previousIncome: number;
    previousExpenses: number;
}

export interface BalanceMovement {
    id: number;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
}

class BalanceService {
    async getSummary(businessId: number, startDate: string, endDate: string): Promise<BalanceSummary> {
        try {
            const response = await api.get(`/businesses/${businessId}/reports/summary`, {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                },
            });
            const data = response.data;
            
            return {
                income: data.sales.total + (data.payments?.total || 0),
                expenses: data.expenses.total,
                profit: (data.sales.total + (data.payments?.total || 0)) - data.expenses.total,
                margin: (data.sales.total + (data.payments?.total || 0)) > 0
                    ? (((data.sales.total + (data.payments?.total || 0)) - data.expenses.total) / (data.sales.total + (data.payments?.total || 0))) * 100
                    : 0,
                previousIncome: 0,
                previousExpenses: 0
            };
        } catch (error) {
            console.error('Error fetching balance summary:', error);
            // Return zeroed data on error to prevent UI crash
            return { income: 0, expenses: 0, profit: 0, margin: 0, previousIncome: 0, previousExpenses: 0 };
        }
    }

    async getMovements(businessId: number, startDate: string, endDate: string): Promise<BalanceMovement[]> {
        try {
            const [paymentsRes, expensesRes] = await Promise.all([
                api.get(`/businesses/${businessId}/payments`, {
                    params: { start_date: startDate, end_date: endDate },
                }),
                api.get(`/businesses/${businessId}/expenses`, {
                    params: { start_date: startDate, end_date: endDate },
                }),
            ]);

            const payments: BalanceMovement[] = (paymentsRes.data.payments || []).map((p: any) => ({
                id: Number(`1${p.id}`),
                date: p.payment_date,
                description: p.note || `Pago cliente ${p.customer_name || p.customer_id}`,
                amount: p.amount,
                type: 'income',
                category: p.method || 'pago',
            }));

            const expenses: BalanceMovement[] = (expensesRes.data.expenses || []).map((e: any) => ({
                id: Number(`2${e.id}`),
                date: e.expense_date,
                description: e.description || e.category || 'Gasto',
                amount: e.amount,
                type: 'expense',
                category: e.category || 'gasto',
            }));

            const all = [...payments, ...expenses].sort((a, b) => a.date.localeCompare(b.date));
            return all;
        } catch (error) {
             console.error('Error fetching movements:', error);
             return [];
        }
    }
}

export const balanceService = new BalanceService();
