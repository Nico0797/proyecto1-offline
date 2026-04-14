import api from './api';
import { hasOfflineSessionSeed } from './offlineSession';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import type { Expense, Invoice, Payment, Sale } from '../types';
import {
    buildLocalInvoiceReceivablesOverview,
    buildLocalReceivablesOverview,
    isPureOfflineRuntime,
    readCompatibleOfflineExpenses,
    readOfflineInvoices,
    readOfflinePayments,
    readOfflineSales,
} from './offlineLocalData';

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

const safeNumber = (value: any) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const toDateKey = (value?: string | null) => String(value || '').split('T')[0];

const parseDay = (value: string) => new Date(`${value}T00:00:00`);

const isDateWithinRange = (value: string | null | undefined, startDate: string, endDate: string) => {
    const dateKey = toDateKey(value);
    if (!dateKey) return false;
    return dateKey >= startDate && dateKey <= endDate;
};

const subtractDays = (value: string, days: number) => {
    const date = parseDay(value);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
};

const diffDaysInclusive = (startDate: string, endDate: string) => {
    const diffMs = parseDay(endDate).getTime() - parseDay(startDate).getTime();
    return Math.max(1, Math.round(diffMs / 86400000) + 1);
};

const shouldUseLocalOnly = () => isOfflineProductMode() || (!localStorage.getItem('token') && hasOfflineSessionSeed());

const buildEmptySummary = (): BalanceSummary => ({
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
});

const getInvoicePaymentSignedAmount = (payment: Invoice['payments'][number]) => {
    if (payment?.signed_amount != null) return safeNumber(payment.signed_amount);
    const eventType = String(payment?.event_type || 'payment').toLowerCase();
    const amount = safeNumber(payment?.amount);
    return eventType === 'refund' || eventType === 'reversal' ? -amount : amount;
};

const resolveCashOutFlowGroup = (expense: Expense): BalanceMovement['flow_group'] => {
    const sourceType = String(expense.source_type || 'manual').toLowerCase();
    if (sourceType === 'supplier_payment' || sourceType === 'purchase_payment') return 'supplier_payment';
    if (sourceType === 'debt_payment') {
        return expense.debt_scope === 'financial' ? 'financial_debt_payment' : 'operational_obligation_payment';
    }
    return 'operational_expense';
};

const isOperationalExecutedExpense = (expense: Expense) => {
    const sourceType = String(expense.source_type || 'manual').toLowerCase();
    return sourceType !== 'supplier_payment' && sourceType !== 'debt_payment' && sourceType !== 'purchase_payment';
};

const buildLocalMetrics = ({
    sales,
    payments,
    invoices,
    expenses,
    startDate,
    endDate,
}: {
    sales: Sale[];
    payments: Payment[];
    invoices: Invoice[];
    expenses: Expense[];
    startDate: string;
    endDate: string;
}) => {
    const visibleSales = sales.filter((sale) => String(sale.status || 'completed').toLowerCase() !== 'cancelled');
    const salesInPeriod = visibleSales.filter((sale) => isDateWithinRange(sale.sale_date, startDate, endDate));
    const paymentsInPeriod = payments.filter((payment) => isDateWithinRange(payment.payment_date, startDate, endDate));
    const expensesInPeriod = expenses.filter((expense) => isDateWithinRange(expense.expense_date, startDate, endDate));
    const invoicePaymentsInPeriod = invoices.flatMap((invoice) =>
        (invoice.payments || [])
            .filter((payment) => isDateWithinRange(payment.payment_date, startDate, endDate))
            .map((payment) => ({ invoice, payment }))
    );

    const allocatedBySaleId = new Map<number, number>();
    payments.forEach((payment) => {
        (payment.allocations || []).forEach((allocation) => {
            const saleId = Number(allocation.sale_id || 0);
            if (!saleId) return;
            allocatedBySaleId.set(saleId, roundCurrency((allocatedBySaleId.get(saleId) || 0) + safeNumber(allocation.amount)));
        });
    });

    const immediateSaleCollections = salesInPeriod.reduce((sum, sale) => {
        const allocated = allocatedBySaleId.get(Number(sale.id)) || 0;
        const directCollection = Math.max(0, safeNumber(sale.collected_amount) - allocated);
        return sum + directCollection;
    }, 0);

    const customerCollectionsTotal = roundCurrency(
        immediateSaleCollections + paymentsInPeriod.reduce((sum, payment) => sum + safeNumber(payment.amount), 0)
    );

    const invoiceGrossCollectionsTotal = roundCurrency(
        invoicePaymentsInPeriod
            .filter(({ payment }) => String(payment.event_type || 'payment').toLowerCase() === 'payment')
            .reduce((sum, { payment }) => sum + safeNumber(payment.amount), 0)
    );
    const invoiceRefundsTotal = roundCurrency(
        invoicePaymentsInPeriod
            .filter(({ payment }) => String(payment.event_type || '').toLowerCase() === 'refund')
            .reduce((sum, { payment }) => sum + safeNumber(payment.amount), 0)
    );
    const invoiceReversalsTotal = roundCurrency(
        invoicePaymentsInPeriod
            .filter(({ payment }) => String(payment.event_type || '').toLowerCase() === 'reversal')
            .reduce((sum, { payment }) => sum + safeNumber(payment.amount), 0)
    );
    const invoiceNetCollectionsTotal = roundCurrency(
        invoicePaymentsInPeriod.reduce((sum, { payment }) => sum + getInvoicePaymentSignedAmount(payment), 0)
    );

    const salesTotal = roundCurrency(salesInPeriod.reduce((sum, sale) => sum + safeNumber(sale.total), 0));
    const salesCogsTotal = roundCurrency(salesInPeriod.reduce((sum, sale) => sum + safeNumber(sale.total_cost), 0));
    const costedSales = salesInPeriod.filter((sale) => safeNumber(sale.total_cost) > 0.0001);
    const uncostedSales = salesInPeriod.filter((sale) => safeNumber(sale.total_cost) <= 0.0001);

    const operationalExpenses = expensesInPeriod.filter(isOperationalExecutedExpense);
    const supplierPayments = expensesInPeriod.filter((expense) => {
        const sourceType = String(expense.source_type || '').toLowerCase();
        return sourceType === 'supplier_payment' || sourceType === 'purchase_payment';
    });
    const operationalObligationPayments = expensesInPeriod.filter((expense) =>
        String(expense.source_type || '').toLowerCase() === 'debt_payment' && expense.debt_scope !== 'financial'
    );
    const financialDebtPayments = expensesInPeriod.filter((expense) =>
        String(expense.source_type || '').toLowerCase() === 'debt_payment' && expense.debt_scope === 'financial'
    );

    const operationalExpensesExecutedTotal = roundCurrency(operationalExpenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0));
    const supplierPaymentsTotal = roundCurrency(supplierPayments.reduce((sum, expense) => sum + safeNumber(expense.amount), 0));
    const operationalObligationPaymentsTotal = roundCurrency(operationalObligationPayments.reduce((sum, expense) => sum + safeNumber(expense.amount), 0));
    const financialDebtPaymentsTotal = roundCurrency(financialDebtPayments.reduce((sum, expense) => sum + safeNumber(expense.amount), 0));

    const cashIn = roundCurrency(customerCollectionsTotal + invoiceNetCollectionsTotal);
    const cashOut = roundCurrency(
        operationalExpensesExecutedTotal
        + supplierPaymentsTotal
        + operationalObligationPaymentsTotal
        + financialDebtPaymentsTotal
        + invoiceRefundsTotal
        + invoiceReversalsTotal
    );
    const grossProfit = roundCurrency(salesTotal - salesCogsTotal);
    const netProfit = roundCurrency(grossProfit - operationalExpensesExecutedTotal);
    const margin = salesTotal > 0 ? roundCurrency((netProfit / salesTotal) * 100) : 0;

    const expenseCategoryMap = new Map<string, number>();
    operationalExpenses.forEach((expense) => {
        const category = String(expense.category || 'Sin categoría');
        expenseCategoryMap.set(category, roundCurrency((expenseCategoryMap.get(category) || 0) + safeNumber(expense.amount)));
    });

    const expenseCategories: BalanceExpenseCategory[] = Array.from(expenseCategoryMap.entries())
        .map(([category, total]) => ({
            key: category,
            category,
            total,
        }))
        .sort((left, right) => right.total - left.total);

    const cashOutBreakdown: BalanceBreakdownItem[] = [
        { key: 'operational_expense', label: 'Gasto operativo', total: operationalExpensesExecutedTotal },
        { key: 'supplier_payment', label: 'Pagos operativos', total: roundCurrency(supplierPaymentsTotal + operationalObligationPaymentsTotal) },
        { key: 'financial_debt_payment', label: 'Pagos deuda financiera', total: financialDebtPaymentsTotal },
        { key: 'invoice_adjustments', label: 'Reembolsos y reversiones', total: roundCurrency(invoiceRefundsTotal + invoiceReversalsTotal) },
    ].filter((item) => item.total > 0.0001);

    const movements: BalanceMovement[] = [
        ...salesInPeriod
            .map((sale) => {
                const allocated = allocatedBySaleId.get(Number(sale.id)) || 0;
                const directCollection = roundCurrency(Math.max(0, safeNumber(sale.collected_amount) - allocated));
                if (directCollection <= 0.0001) return null;
                return {
                    id: Number(`1${sale.id}`),
                    date: toDateKey(sale.sale_date),
                    description: sale.customer_name ? `Venta a ${sale.customer_name}` : `Venta #${sale.id}`,
                    amount: directCollection,
                    type: 'income' as const,
                    source_type: 'sale',
                    source_label: 'Venta',
                    flow_group: 'cash_in' as const,
                    scope: null,
                };
            })
            .filter(Boolean) as BalanceMovement[],
        ...paymentsInPeriod.map((payment) => ({
            id: Number(`2${payment.id}`),
            date: toDateKey(payment.payment_date),
            description: payment.customer_name ? `Cobro a ${payment.customer_name}` : `Cobro #${payment.id}`,
            amount: roundCurrency(safeNumber(payment.amount)),
            type: 'income' as const,
            source_type: 'payment',
            source_label: 'Cobro',
            flow_group: 'cash_in' as const,
            scope: null,
        })),
        ...invoicePaymentsInPeriod.map(({ invoice, payment }) => ({
            id: Number(`3${payment.id}`),
            date: toDateKey(payment.payment_date),
            description: invoice.invoice_number ? `Factura ${invoice.invoice_number}` : `Factura #${invoice.id}`,
            amount: Math.abs(roundCurrency(getInvoicePaymentSignedAmount(payment))),
            type: getInvoicePaymentSignedAmount(payment) >= 0 ? 'income' as const : 'expense' as const,
            source_type: String(payment.event_type || 'payment'),
            source_label: 'Factura',
            scope: null,
        })),
        ...expensesInPeriod.map((expense) => ({
            id: Number(`4${expense.id}`),
            date: toDateKey(expense.expense_date),
            description: expense.description || expense.category || 'Movimiento',
            amount: roundCurrency(safeNumber(expense.amount)),
            type: 'expense' as const,
            category: expense.category || undefined,
            source_type: expense.source_type ? String(expense.source_type) : undefined,
            source_label: expense.source_type ? String(expense.source_type) : undefined,
            flow_group: resolveCashOutFlowGroup(expense),
            scope: expense.debt_scope ?? null,
        })),
    ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

    return {
        summary: {
            salesTotal,
            salesCogsTotal,
            costedSalesTotal: roundCurrency(costedSales.reduce((sum, sale) => sum + safeNumber(sale.total), 0)),
            uncostedSalesTotal: roundCurrency(uncostedSales.reduce((sum, sale) => sum + safeNumber(sale.total), 0)),
            missingCostSalesCount: uncostedSales.length,
            expensesTotal: operationalExpensesExecutedTotal,
            netProfit,
            grossProfit,
            margin,
            cashIn,
            cashOut,
            cashNet: roundCurrency(cashIn - cashOut),
            customerCollectionsTotal,
            invoicePaymentsTotal: invoiceGrossCollectionsTotal,
            invoiceGrossCollectionsTotal,
            invoiceRefundsTotal,
            invoiceReversalsTotal,
            invoiceNetCollectionsTotal,
            invoiceCollectionsTotal: invoiceNetCollectionsTotal,
            invoiceInvoicedTotal: roundCurrency(invoices.filter((invoice) => isDateWithinRange(invoice.issue_date, startDate, endDate)).reduce((sum, invoice) => sum + safeNumber(invoice.total), 0)),
            invoiceCollectionRate: 0,
            invoiceAverageDaysToCollect: null,
            invoiceReceivableOpenCount: 0,
            invoiceReceivableOverdueCount: 0,
            invoiceReceivableCustomerCount: 0,
            accountsReceivable: 0,
            salesAccountsReceivable: 0,
            invoiceAccountsReceivable: 0,
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
            operationalExpensesExecutedTotal,
            supplierPaymentsTotal,
            operationalObligationPaymentsTotal,
            financialDebtPaymentsTotal,
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
        expenseCategories,
        cashOutBreakdown,
        movements,
    };
};

const buildLocalDashboard = async (businessId: number, startDate: string, endDate: string): Promise<FinancialDashboardPayload> => {
    const periodDays = diffDaysInclusive(startDate, endDate);
    const previousEndDate = subtractDays(startDate, 1);
    const previousStartDate = subtractDays(previousEndDate, periodDays - 1);

    const [sales, payments, invoices, expenses, receivablesOverview, invoiceReceivablesOverview] = await Promise.all([
        readOfflineSales(businessId),
        readOfflinePayments(businessId),
        readOfflineInvoices(businessId),
        Promise.resolve(readCompatibleOfflineExpenses(businessId)),
        buildLocalReceivablesOverview(businessId),
        buildLocalInvoiceReceivablesOverview(businessId),
    ]);

    const current = buildLocalMetrics({ sales, payments, invoices, expenses, startDate, endDate });
    const previous = buildLocalMetrics({ sales, payments, invoices, expenses, startDate: previousStartDate, endDate: previousEndDate });
    const invoiceSummary = invoiceReceivablesOverview.summary || {};
    const receivablesSummary = receivablesOverview.summary || {};
    const receivableCustomers = receivablesOverview.customers || [];

    return {
        period: { start: startDate, end: endDate },
        summary: {
            ...buildEmptySummary(),
            ...current.summary,
            accountsReceivable: roundCurrency(safeNumber(receivablesSummary.total_pending) + safeNumber(invoiceSummary.total_outstanding)),
            salesAccountsReceivable: roundCurrency(safeNumber(receivablesSummary.total_pending)),
            invoiceAccountsReceivable: roundCurrency(safeNumber(invoiceSummary.total_outstanding)),
            invoiceCollectionRate: safeNumber(invoiceSummary.collection_rate),
            invoiceAverageDaysToCollect: invoiceSummary.average_days_to_collect ?? null,
            invoiceReceivableOpenCount: safeNumber(invoiceSummary.unpaid_invoice_count),
            invoiceReceivableOverdueCount: safeNumber(invoiceSummary.overdue_invoice_count),
            invoiceReceivableCustomerCount: safeNumber(invoiceSummary.customer_count),
            overdueReceivables: roundCurrency(safeNumber(receivablesSummary.overdue_total) + safeNumber(invoiceSummary.overdue_total)),
            dueTodayReceivables: roundCurrency(safeNumber(receivablesSummary.due_today_total) + safeNumber(invoiceSummary.due_today_total)),
            dueSoonReceivables: roundCurrency(safeNumber(receivablesSummary.due_soon_total) + safeNumber(invoiceSummary.due_soon_total)),
            receivableCustomersCount: Math.max(safeNumber(receivablesSummary.customers_with_balance), safeNumber(invoiceSummary.customer_count)),
            receivableOverdueCustomersCount: receivableCustomers.filter((customer: any) => String(customer.status || '').toLowerCase() === 'overdue').length,
            previousSalesTotal: previous.summary.salesTotal,
            previousSalesCogsTotal: previous.summary.salesCogsTotal,
            previousCostedSalesTotal: previous.summary.costedSalesTotal,
            previousUncostedSalesTotal: previous.summary.uncostedSalesTotal,
            previousMissingCostSalesCount: previous.summary.missingCostSalesCount,
            previousExpensesTotal: previous.summary.expensesTotal,
            previousNetProfit: previous.summary.netProfit,
            previousGrossProfit: previous.summary.grossProfit,
            previousCashIn: previous.summary.cashIn,
            previousCashOut: previous.summary.cashOut,
            previousCashNet: previous.summary.cashNet,
            previousOperationalExpensesExecutedTotal: previous.summary.operationalExpensesExecutedTotal,
            previousSupplierPaymentsTotal: previous.summary.supplierPaymentsTotal,
            previousOperationalObligationPaymentsTotal: previous.summary.operationalObligationPaymentsTotal,
            previousFinancialDebtPaymentsTotal: previous.summary.financialDebtPaymentsTotal,
        },
        expenseCategories: current.expenseCategories,
        cashOutBreakdown: current.cashOutBreakdown,
        movements: current.movements,
    };
};

class BalanceService {
    async getDashboard(businessId: number, startDate: string, endDate: string): Promise<FinancialDashboardPayload> {
        if (isPureOfflineRuntime() || shouldUseLocalOnly()) {
            return buildLocalDashboard(businessId, startDate, endDate);
        }

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
            const summaryCashNet = roundCurrency(summaryCashIn - summaryCashOut);
            const previousCashIn = normalizeNumber(previous.cash_in, previous.cashFlow?.in, previous.cash_flow?.in);
            const previousCashOut = normalizeNumber(previous.cash_out, previous.cashFlow?.out, previous.cash_flow?.out);
            const previousCashNet = roundCurrency(previousCashIn - previousCashOut);
            
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
                    previousCashIn,
                    previousCashOut,
                    previousCashNet,
                    previousOperationalExpensesExecutedTotal: previous.operational_expenses_executed_total || 0,
                    previousSupplierPaymentsTotal: previous.supplier_payments_total || 0,
                    previousOperationalObligationPaymentsTotal: previous.operational_obligation_payments_total || 0,
                    previousFinancialDebtPaymentsTotal: previous.financial_debt_payments_total || 0,
                },
                expenseCategories,
                cashOutBreakdown,
                movements,
            };
        } catch (error: any) {
            console.error('Error fetching financial dashboard:', error);
            if (error?.isOfflineRequestError || !error?.response) {
                return buildLocalDashboard(businessId, startDate, endDate);
            }

            return {
                period: { start: startDate, end: endDate },
                summary: buildEmptySummary(),
                expenseCategories: [],
                cashOutBreakdown: [],
                movements: [],
            };
        }
    }
}

export const balanceService = new BalanceService();
