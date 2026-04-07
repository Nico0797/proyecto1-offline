import api from './api';

export type PeriodType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface BalanceSummary {
    salesTotal: number;
    salesCogsTotal: number;
    costedSalesTotal: number;
    uncostedSalesTotal: number;
    missingCostSalesCount: number;
    expensesTotal: number;
    netProfit: number;
    grossProfit: number;
    margin: number;
    cashIn: number;
    cashOut: number;
    cashNet: number;
    accountsReceivable: number;
    salesAccountsReceivable: number;
    invoiceAccountsReceivable: number;
    invoicePaymentsTotal: number;
    invoiceGrossCollectionsTotal: number;
    invoiceRefundsTotal: number;
    invoiceReversalsTotal: number;
    invoiceNetCollectionsTotal: number;
    customerCollectionsTotal: number;
    invoiceCollectionsTotal: number;
    invoiceInvoicedTotal: number;
    invoiceCollectionRate: number;
    invoiceAverageDaysToCollect: number | null;
    invoiceReceivableOpenCount: number;
    invoiceReceivableOverdueCount: number;
    invoiceReceivableCustomerCount: number;
    accountsPayable: number;
    overdueReceivables: number;
    dueTodayReceivables: number;
    dueSoonReceivables: number;
    overduePayables: number;
    dueTodayPayables: number;
    dueSoonPayables: number;
    payableActiveCount: number;
    receivableCustomersCount: number;
    receivableOverdueCustomersCount: number;
    operationalExpensesExecutedTotal: number;
    supplierPaymentsTotal: number;
    operationalObligationPaymentsTotal: number;
    financialDebtPaymentsTotal: number;
    operationalPayablesTotal: number;
    operationalPayablesOverdueTotal: number;
    operationalPayablesDueTodayTotal: number;
    operationalPayablesDueSoonTotal: number;
    operationalPayablesActiveCount: number;
    financialDebtTotal: number;
    financialDebtOverdueTotal: number;
    financialDebtDueTodayTotal: number;
    financialDebtDueSoonTotal: number;
    financialDebtActiveCount: number;
    previousSalesTotal: number;
    previousSalesCogsTotal: number;
    previousCostedSalesTotal: number;
    previousUncostedSalesTotal: number;
    previousMissingCostSalesCount: number;
    previousExpensesTotal: number;
    previousNetProfit: number;
    previousGrossProfit: number;
    previousCashIn: number;
    previousCashOut: number;
    previousCashNet: number;
    previousOperationalExpensesExecutedTotal: number;
    previousSupplierPaymentsTotal: number;
    previousOperationalObligationPaymentsTotal: number;
    previousFinancialDebtPaymentsTotal: number;
}

export interface BalanceMovement {
    id: number;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
    source_type?: string;
    source_label?: string;
    flow_group?: 'cash_in' | 'operational_expense' | 'supplier_payment' | 'operational_obligation_payment' | 'financial_debt_payment';
    scope?: 'operational' | 'financial' | null;
}

export interface BalanceExpenseCategory {
    key: string;
    category: string;
    total: number;
}

export interface BalanceBreakdownItem {
    key: string;
    label: string;
    total: number;
}

export interface FinancialDashboardPayload {
    period: {
        start: string;
        end: string;
    };
    summary: BalanceSummary;
    expenseCategories: BalanceExpenseCategory[];
    cashOutBreakdown: BalanceBreakdownItem[];
    movements: BalanceMovement[];
}

class BalanceService {
    async getDashboard(businessId: number, startDate: string, endDate: string): Promise<FinancialDashboardPayload> {
        try {
            const response = await api.get(`/businesses/${businessId}/reports/financial-dashboard`, {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                },
            });
            const data = response.data;
            const summary = data.summary || {};
            const previous = data.previous_period || {};
            const normalizeNumber = (...values: any[]) => {
                for (const value of values) {
                    if (value !== undefined && value !== null && value !== '') {
                        return Number(value || 0);
                    }
                }
                return 0;
            };
            const expenseCategories = (data.expense_categories || []).map((item: any, index: number) => ({
                key: String(item.key || item.category || `expense-category-${index}`),
                category: String(item.category || item.key || 'Sin categoría'),
                total: Number(item.total || 0),
            }));
            const cashOutBreakdown = (data.cash_out_breakdown || []).map((item: any, index: number) => ({
                key: String(item.key || `cash-out-${index}`),
                label: String(item.label || item.key || 'Sin etiqueta'),
                total: Number(item.total || 0),
            }));
            const movements = (data.movements || []).map((item: any, index: number) => ({
                id: Number(item.id || index + 1),
                date: String(item.date || ''),
                description: String(item.description || 'Movimiento'),
                amount: Math.abs(Number(item.amount || 0)),
                type: item.type === 'income' ? 'income' : 'expense',
                category: item.category ? String(item.category) : undefined,
                source_type: item.source_type ? String(item.source_type) : undefined,
                source_label: item.source_label ? String(item.source_label) : undefined,
                flow_group: item.flow_group,
                scope: item.scope ?? null,
            }));
            const summaryCashIn = normalizeNumber(summary.cash_in, summary.cashFlow?.in, summary.cash_flow?.in, data.cash_flow?.in);
            const summaryCashOut = normalizeNumber(summary.cash_out, summary.cashFlow?.out, summary.cash_flow?.out, data.cash_flow?.out);
            const summaryCashNet = normalizeNumber(summary.cash_net, summary.cashFlow?.net, summary.cash_flow?.net, data.cash_flow?.net);
            
            return {
                period: data.period || { start: startDate, end: endDate },
                summary: {
                    salesTotal: summary.sales_total || 0,
                    salesCogsTotal: summary.sales_cogs_total || 0,
                    costedSalesTotal: summary.costed_sales_total || 0,
                    uncostedSalesTotal: summary.uncosted_sales_total || 0,
                    missingCostSalesCount: summary.missing_cost_sales_count || 0,
                    expensesTotal: summary.expenses_total || 0,
                    netProfit: summary.net_profit || 0,
                    grossProfit: summary.gross_profit || 0,
                    margin: summary.margin_percent || 0,
                    cashIn: summaryCashIn,
                    cashOut: summaryCashOut,
                    cashNet: summaryCashNet,
                    accountsReceivable: summary.accounts_receivable || 0,
                    salesAccountsReceivable: summary.sales_accounts_receivable || 0,
                    invoiceAccountsReceivable: summary.invoice_accounts_receivable || 0,
                    invoicePaymentsTotal: summary.invoice_payments_total || 0,
                    invoiceGrossCollectionsTotal: summary.invoice_gross_collections_total || 0,
                    invoiceRefundsTotal: summary.invoice_refunds_total || 0,
                    invoiceReversalsTotal: summary.invoice_reversals_total || 0,
                    invoiceNetCollectionsTotal: summary.invoice_net_collections_total || summary.invoice_payments_total || 0,
                    customerCollectionsTotal: summary.customer_collections_total || 0,
                    invoiceCollectionsTotal: summary.invoice_collections_total || 0,
                    invoiceInvoicedTotal: summary.invoice_invoiced_total || 0,
                    invoiceCollectionRate: summary.invoice_collection_rate || 0,
                    invoiceAverageDaysToCollect: summary.invoice_average_days_to_collect ?? null,
                    invoiceReceivableOpenCount: summary.invoice_receivable_open_count || 0,
                    invoiceReceivableOverdueCount: summary.invoice_receivable_overdue_count || 0,
                    invoiceReceivableCustomerCount: summary.invoice_receivable_customer_count || 0,
                    accountsPayable: summary.accounts_payable || 0,
                    overdueReceivables: summary.receivables_overdue_total || 0,
                    dueTodayReceivables: summary.receivables_due_today_total || 0,
                    dueSoonReceivables: summary.receivables_due_soon_total || 0,
                    overduePayables: summary.payables_overdue_total || 0,
                    dueTodayPayables: summary.payables_due_today_total || 0,
                    dueSoonPayables: summary.payables_due_soon_total || 0,
                    payableActiveCount: summary.payables_active_count || 0,
                    receivableCustomersCount: summary.receivable_customers_count || 0,
                    receivableOverdueCustomersCount: summary.receivable_overdue_customers_count || 0,
                    operationalExpensesExecutedTotal: summary.operational_expenses_executed_total || 0,
                    supplierPaymentsTotal: summary.supplier_payments_total || 0,
                    operationalObligationPaymentsTotal: summary.operational_obligation_payments_total || 0,
                    financialDebtPaymentsTotal: summary.financial_debt_payments_total || 0,
                    operationalPayablesTotal: summary.operational_payables_total || 0,
                    operationalPayablesOverdueTotal: summary.operational_payables_overdue_total || 0,
                    operationalPayablesDueTodayTotal: summary.operational_payables_due_today_total || 0,
                    operationalPayablesDueSoonTotal: summary.operational_payables_due_soon_total || 0,
                    operationalPayablesActiveCount: summary.operational_payables_active_count || 0,
                    financialDebtTotal: summary.financial_debt_total || 0,
                    financialDebtOverdueTotal: summary.financial_debt_overdue_total || 0,
                    financialDebtDueTodayTotal: summary.financial_debt_due_today_total || 0,
                    financialDebtDueSoonTotal: summary.financial_debt_due_soon_total || 0,
                    financialDebtActiveCount: summary.financial_debt_active_count || 0,
                    previousSalesTotal: previous.sales_total || 0,
                    previousSalesCogsTotal: previous.sales_cogs_total || 0,
                    previousCostedSalesTotal: previous.costed_sales_total || 0,
                    previousUncostedSalesTotal: previous.uncosted_sales_total || 0,
                    previousMissingCostSalesCount: previous.missing_cost_sales_count || 0,
                    previousExpensesTotal: previous.expenses_total || 0,
                    previousNetProfit: previous.net_profit || 0,
                    previousGrossProfit: previous.gross_profit || 0,
                    previousCashIn: normalizeNumber(previous.cash_in, previous.cashFlow?.in, previous.cash_flow?.in),
                    previousCashOut: normalizeNumber(previous.cash_out, previous.cashFlow?.out, previous.cash_flow?.out),
                    previousCashNet: normalizeNumber(previous.cash_net, previous.cashFlow?.net, previous.cash_flow?.net),
                    previousOperationalExpensesExecutedTotal: previous.operational_expenses_executed_total || 0,
                    previousSupplierPaymentsTotal: previous.supplier_payments_total || 0,
                    previousOperationalObligationPaymentsTotal: previous.operational_obligation_payments_total || 0,
                    previousFinancialDebtPaymentsTotal: previous.financial_debt_payments_total || 0,
                },
                expenseCategories,
                cashOutBreakdown,
                movements,
            };
        } catch (error) {
            console.error('Error fetching financial dashboard:', error);
            return {
                period: { start: startDate, end: endDate },
                summary: {
                    salesTotal: 0,
                    salesCogsTotal: 0,
                    costedSalesTotal: 0,
                    uncostedSalesTotal: 0,
                    missingCostSalesCount: 0,
                    expensesTotal: 0,
                    netProfit: 0,
                    grossProfit: 0,
                    margin: 0,
                    cashIn: 0,
                    cashOut: 0,
                    cashNet: 0,
                    accountsReceivable: 0,
                    salesAccountsReceivable: 0,
                    invoiceAccountsReceivable: 0,
                    invoicePaymentsTotal: 0,
                    invoiceGrossCollectionsTotal: 0,
                    invoiceRefundsTotal: 0,
                    invoiceReversalsTotal: 0,
                    invoiceNetCollectionsTotal: 0,
                    customerCollectionsTotal: 0,
                    invoiceCollectionsTotal: 0,
                    invoiceInvoicedTotal: 0,
                    invoiceCollectionRate: 0,
                    invoiceAverageDaysToCollect: null,
                    invoiceReceivableOpenCount: 0,
                    invoiceReceivableOverdueCount: 0,
                    invoiceReceivableCustomerCount: 0,
                    accountsPayable: 0,
                    overdueReceivables: 0,
                    dueTodayReceivables: 0,
                    dueSoonReceivables: 0,
                    overduePayables: 0,
                    dueTodayPayables: 0,
                    dueSoonPayables: 0,
                    payableActiveCount: 0,
                    receivableCustomersCount: 0,
                    receivableOverdueCustomersCount: 0,
                    operationalExpensesExecutedTotal: 0,
                    supplierPaymentsTotal: 0,
                    operationalObligationPaymentsTotal: 0,
                    financialDebtPaymentsTotal: 0,
                    operationalPayablesTotal: 0,
                    operationalPayablesOverdueTotal: 0,
                    operationalPayablesDueTodayTotal: 0,
                    operationalPayablesDueSoonTotal: 0,
                    operationalPayablesActiveCount: 0,
                    financialDebtTotal: 0,
                    financialDebtOverdueTotal: 0,
                    financialDebtDueTodayTotal: 0,
                    financialDebtDueSoonTotal: 0,
                    financialDebtActiveCount: 0,
                    previousSalesTotal: 0,
                    previousSalesCogsTotal: 0,
                    previousCostedSalesTotal: 0,
                    previousUncostedSalesTotal: 0,
                    previousMissingCostSalesCount: 0,
                    previousExpensesTotal: 0,
                    previousNetProfit: 0,
                    previousGrossProfit: 0,
                    previousCashIn: 0,
                    previousCashOut: 0,
                    previousCashNet: 0,
                    previousOperationalExpensesExecutedTotal: 0,
                    previousSupplierPaymentsTotal: 0,
                    previousOperationalObligationPaymentsTotal: 0,
                    previousFinancialDebtPaymentsTotal: 0,
                },
                expenseCategories: [],
                cashOutBreakdown: [],
                movements: [],
            };
        }
    }
}

export const balanceService = new BalanceService();
