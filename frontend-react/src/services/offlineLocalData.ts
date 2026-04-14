import { isDesktopOfflineMode, isOfflineProductMode } from '../runtime/runtimeMode';
import { offlineDb } from './offlineDb';
import type { Business, Customer, Expense, Invoice, Payment, Product, Sale } from '../types';
import { hasOfflineSessionSeed } from './offlineSession';

export const isPureOfflineRuntime = () => {
  if (typeof window === 'undefined') return false;
  return isOfflineProductMode() || (!localStorage.getItem('token') && hasOfflineSessionSeed());
};

export const createBusinessScopedStorageKey = (businessId: number, collection: string) => `offline:${businessId}:${collection}`;

export const readLocalCollection = <T>(businessId: number, collection: string): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(createBusinessScopedStorageKey(businessId, collection));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeLocalCollection = <T>(businessId: number, collection: string, records: T[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(createBusinessScopedStorageKey(businessId, collection), JSON.stringify(records));
};

export const nextLocalNumericId = (records: Array<{ id?: number | string }>) => {
  const numericIds = records
    .map((record) => Number(record.id))
    .filter((value) => Number.isFinite(value) && value > 0);
  return (numericIds.length ? Math.max(...numericIds) : 0) + 1;
};

export const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase();

export const readCompatibleOfflineExpenses = (businessId: number): Expense[] => {
  const primaryKey = createBusinessScopedStorageKey(businessId, 'expenses');
  const legacyKey = createBusinessScopedStorageKey(businessId, 'expense');
  const merged = new Map<number, Expense>();

  for (const key of [primaryKey, legacyKey]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      parsed.forEach((expense) => {
        const numericId = Number(expense?.id);
        if (!Number.isFinite(numericId)) return;
        merged.set(numericId, expense as Expense);
      });
    } catch {
      continue;
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const rightTime = new Date(right.expense_date || right.created_at || 0).getTime();
    const leftTime = new Date(left.expense_date || left.created_at || 0).getTime();
    return rightTime - leftTime;
  });
};

export const writeCompatibleOfflineExpenses = (businessId: number, expenses: Expense[]) => {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(expenses);
  localStorage.setItem(createBusinessScopedStorageKey(businessId, 'expenses'), serialized);
  localStorage.setItem(createBusinessScopedStorageKey(businessId, 'expense'), serialized);
};

const safeArray = <T>(value: T[] | null | undefined) => Array.isArray(value) ? value : [];

const getStoredUserId = () => {
  if (typeof window === 'undefined') return 0;

  try {
    return Number(JSON.parse(window.localStorage.getItem('user') || 'null')?.id || 0);
  } catch {
    return 0;
  }
};

const getBusinessScopeId = () => {
  const userId = getStoredUserId();
  if (!userId && isDesktopOfflineMode()) {
    return 1;
  }
  return userId;
};

const isOfflineDeletedRecord = (record: unknown) => {
  if (!record || typeof record !== 'object') return false;
  return (record as { offline_deleted?: boolean }).offline_deleted === true;
};

const filterVisibleRecords = <T>(records: T[]) => records.filter((record) => !isOfflineDeletedRecord(record));

const safeNumber = (value: any) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const toDateKey = (value?: string | null) => String(value || '').split('T')[0];

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const diffDays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
};

const isDateWithinRange = (value: string | null | undefined, startDate: string, endDate: string) => {
  const dateKey = toDateKey(value);
  if (!dateKey) return false;
  return dateKey >= startDate && dateKey <= endDate;
};

const normalizeSale = (sale: Sale): Sale => ({
  ...sale,
  collected_amount: safeNumber((sale as any).collected_amount ?? (sale as any).amount_paid ?? (sale as any).total_paid ?? 0),
  balance: safeNumber(sale.balance ?? Math.max(safeNumber(sale.total) - safeNumber((sale as any).collected_amount ?? (sale as any).amount_paid ?? 0), 0)),
  subtotal: safeNumber(sale.subtotal),
  discount: safeNumber(sale.discount),
  total: safeNumber(sale.total),
  total_cost: safeNumber(sale.total_cost),
  items: Array.isArray(sale.items) ? sale.items : [],
 });

const normalizePayment = (payment: Payment): Payment => ({
  ...payment,
  amount: safeNumber(payment.amount),
  allocations: Array.isArray(payment.allocations)
    ? payment.allocations.map((allocation) => ({
        ...allocation,
        sale_id: Number(allocation.sale_id || 0),
        amount: safeNumber(allocation.amount),
      }))
    : [],
});

const normalizeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  subtotal: safeNumber(invoice.subtotal),
  discount_total: safeNumber(invoice.discount_total),
  tax_total: safeNumber(invoice.tax_total),
  total: safeNumber(invoice.total),
  amount_paid: safeNumber(invoice.amount_paid),
  outstanding_balance: safeNumber(invoice.outstanding_balance ?? invoice.balance ?? Math.max(safeNumber(invoice.total) - safeNumber(invoice.amount_paid), 0)),
  gross_collected_amount: safeNumber(invoice.gross_collected_amount ?? invoice.amount_paid),
  refunded_amount: safeNumber(invoice.refunded_amount),
  reversed_amount: safeNumber(invoice.reversed_amount),
  net_collected_amount: safeNumber(invoice.net_collected_amount ?? invoice.amount_paid),
  items: Array.isArray(invoice.items) ? invoice.items : [],
  payments: Array.isArray(invoice.payments)
    ? invoice.payments.map((payment) => ({
        ...payment,
        amount: safeNumber(payment.amount),
        signed_amount: safeNumber(payment.signed_amount ?? payment.amount),
      }))
    : [],
});

const sortSalesByDateAsc = (sales: Sale[]) => [...sales].sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());

const getBusinessTermConfig = (business: Business | null) => {
  const settings = business?.settings || {};
  const defaultTermDays = typeof settings.debt_term_days === 'number'
    ? settings.debt_term_days
    : typeof business?.credit_days === 'number'
      ? business.credit_days
      : 30;
  const dueSoonDays = typeof settings.debt_due_soon_days === 'number' ? settings.debt_due_soon_days : 5;
  const overrides = settings.receivable_term_overrides && typeof settings.receivable_term_overrides === 'object'
    ? settings.receivable_term_overrides as Record<string, { term_days?: number }>
    : {};
  return { defaultTermDays, dueSoonDays, overrides };
};

const computeReceivableStatus = (dueDate: string, dueSoonDays: number) => {
  const daysUntilDue = diffDays(new Date().toISOString().split('T')[0], dueDate);
  const due = new Date(`${dueDate}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (due.getTime() < now.getTime()) {
    return { status: 'overdue', daysUntilDue: -Math.abs(diffDays(dueDate, now.toISOString().split('T')[0])) };
  }
  if (due.getTime() === now.getTime()) {
    return { status: 'due_today', daysUntilDue: 0 };
  }
  if (daysUntilDue <= dueSoonDays) {
    return { status: 'due_soon', daysUntilDue };
  }
  return { status: 'current', daysUntilDue };
};

export const readOfflineBusiness = async (businessId: number): Promise<Business | null> => {
  if (typeof window === 'undefined') return null;
  return offlineDb.getEntity<Business>('businesses', getBusinessScopeId(), businessId);
};

export const readOfflineCustomers = async (businessId: number): Promise<Customer[]> => {
  if (typeof window === 'undefined') return [];
  try {
    return filterVisibleRecords(safeArray(await offlineDb.getEntities<Customer>('customers', businessId)));
  } catch {
    return [];
  }
};

export const readOfflineProducts = async (businessId: number): Promise<Product[]> => {
  if (typeof window === 'undefined') return [];
  try {
    return filterVisibleRecords(safeArray(await offlineDb.getEntities<Product>('products', businessId)));
  } catch {
    return [];
  }
};

export const readOfflineSales = async (businessId: number): Promise<Sale[]> => {
  if (typeof window === 'undefined') return [];
  try {
    return filterVisibleRecords(safeArray(await offlineDb.getEntities<Sale>('sales', businessId)).filter(Boolean).map(normalizeSale));
  } catch {
    return [];
  }
};

export const readOfflinePayments = async (businessId: number): Promise<Payment[]> => {
  if (typeof window === 'undefined') return [];
  try {
    return filterVisibleRecords(safeArray(await offlineDb.getEntities<Payment>('payments', businessId)).filter(Boolean).map(normalizePayment));
  } catch {
    return [];
  }
};

export const readOfflineInvoices = async (businessId: number): Promise<Invoice[]> => {
  if (typeof window === 'undefined') return [];
  try {
    return filterVisibleRecords(safeArray(await offlineDb.getEntities<Invoice>('invoices', businessId)).filter(Boolean).map(normalizeInvoice));
  } catch {
    return [];
  }
};

export const buildLocalReceivablesOverview = async (businessId: number) => {
  try {
    const [business, customers, sales] = await Promise.all([
      readOfflineBusiness(businessId),
      readOfflineCustomers(businessId),
      readOfflineSales(businessId),
    ]);

    const { defaultTermDays, dueSoonDays, overrides } = getBusinessTermConfig(business);
    const customerMap = new Map<number, Customer>(safeArray(customers).map((customer) => [customer.id, customer]));
    const receivables = sortSalesByDateAsc(safeArray(sales))
      .filter((sale) => sale?.customer_id && safeNumber(sale.balance) > 0.01 && String(sale.status || 'completed').toLowerCase() !== 'cancelled')
      .map((sale) => {
        const customerId = Number(sale.customer_id || 0);
        const customer = customerMap.get(customerId);
        const override = overrides?.[String(sale.id)];
        const termDays = typeof override?.term_days === 'number' ? override.term_days : defaultTermDays;
        const dueDate = addDays(toDateKey(sale.sale_date), termDays);
        const statusInfo = computeReceivableStatus(dueDate, dueSoonDays);
        return {
          sale_id: sale.id,
          customer_id: customerId,
          customer_name: sale.customer_name || customer?.name || 'Cliente',
          customer_phone: customer?.phone || null,
          document_label: `Venta #${sale.id}`,
          original_amount: safeNumber(sale.total),
          total_paid: safeNumber((sale as any).collected_amount ?? (sale as any).amount_paid),
          pending_balance: safeNumber(sale.balance),
          base_date: toDateKey(sale.sale_date),
          term_days: termDays,
          due_date: dueDate,
          status: statusInfo.status,
          status_label: statusInfo.status,
          days_until_due: statusInfo.daysUntilDue,
        };
      });

    const customersSummaryMap = new Map<number, any>();
    receivables.forEach((item) => {
      const current = customersSummaryMap.get(item.customer_id) || {
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone,
        total_pending: 0,
        overdue_total: 0,
        due_today_total: 0,
        due_soon_total: 0,
        current_total: 0,
        documents_count: 0,
        status: 'current',
      };
      current.total_pending += item.pending_balance;
      current.documents_count += 1;
      if (item.status === 'overdue') current.overdue_total += item.pending_balance;
      else if (item.status === 'due_today') current.due_today_total += item.pending_balance;
      else if (item.status === 'due_soon') current.due_soon_total += item.pending_balance;
      else current.current_total += item.pending_balance;
      if (item.status === 'overdue') current.status = 'overdue';
      else if (item.status === 'due_today' && current.status !== 'overdue') current.status = 'due_today';
      else if (item.status === 'due_soon' && current.status !== 'overdue' && current.status !== 'due_today') current.status = 'due_soon';
      customersSummaryMap.set(item.customer_id, current);
    });

    const customersWithBalance = Array.from(customersSummaryMap.values());

    return {
      summary: {
        total_pending: roundCurrency(receivables.reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        overdue_total: roundCurrency(receivables.filter((item) => item.status === 'overdue').reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        due_today_total: roundCurrency(receivables.filter((item) => item.status === 'due_today').reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        due_soon_total: roundCurrency(receivables.filter((item) => item.status === 'due_soon').reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        customers_with_balance: customersWithBalance.length,
      },
      customers: customersWithBalance,
      receivables,
      settings: {
        default_term_days: defaultTermDays,
        due_soon_days: dueSoonDays,
      },
    };
  } catch {
    return {
      summary: {
        total_pending: 0,
        overdue_total: 0,
        due_today_total: 0,
        due_soon_total: 0,
        customers_with_balance: 0,
      },
      customers: [],
      receivables: [],
      settings: {
        default_term_days: 30,
        due_soon_days: 5,
      },
    };
  }
};

export const buildLocalInvoiceReceivablesOverview = async (businessId: number) => {
  try {
    const invoices = safeArray(await readOfflineInvoices(businessId))
      .filter((invoice) => safeNumber(invoice.outstanding_balance) > 0.01 && String(invoice.status || '').toLowerCase() !== 'cancelled');

    const receivables = invoices.map((invoice) => {
      const dueDate = toDateKey(invoice.due_date || invoice.issue_date);
      const statusInfo = computeReceivableStatus(dueDate, 5);
      return {
        invoice_id: invoice.id,
        customer_id: invoice.customer_id ?? null,
        customer_name: invoice.customer_name || 'Cliente',
        customer_phone: invoice.customer_phone || null,
        invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
        document_label: invoice.invoice_number || `Factura #${invoice.id}`,
        original_amount: safeNumber(invoice.total),
        total_paid: safeNumber(invoice.amount_paid),
        pending_balance: safeNumber(invoice.outstanding_balance),
        issue_date: toDateKey(invoice.issue_date),
        due_date: dueDate,
        status: statusInfo.status,
        status_label: statusInfo.status,
        total: safeNumber(invoice.total),
        paid_amount: safeNumber(invoice.amount_paid),
      };
    });

    const customerIds = new Set(receivables.map((item) => item.customer_id).filter((value) => value != null));
    const invoicedTotal = invoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0);
    const collectedTotal = invoices.reduce((sum, invoice) => sum + safeNumber(invoice.net_collected_amount ?? invoice.amount_paid), 0);

    return {
      summary: {
        total_outstanding: roundCurrency(receivables.reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        overdue_total: roundCurrency(receivables.filter((item) => item.status === 'overdue').reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        due_today_total: roundCurrency(receivables.filter((item) => item.status === 'due_today').reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        due_soon_total: roundCurrency(receivables.filter((item) => item.status === 'due_soon').reduce((sum, item) => sum + safeNumber(item.pending_balance), 0)),
        unpaid_invoice_count: receivables.length,
        overdue_invoice_count: receivables.filter((item) => item.status === 'overdue').length,
        customer_count: customerIds.size,
        collection_rate: invoicedTotal > 0 ? roundCurrency((collectedTotal / invoicedTotal) * 100) : 0,
        average_days_to_collect: null,
      },
      customers: Array.from(customerIds).map((customerId) => ({
        customer_id: Number(customerId),
        customer_name: receivables.find((item) => item.customer_id === customerId)?.customer_name || 'Cliente',
      })),
      receivables,
    };
  } catch {
    return {
      summary: {
        total_outstanding: 0,
        overdue_total: 0,
        due_today_total: 0,
        due_soon_total: 0,
        unpaid_invoice_count: 0,
        overdue_invoice_count: 0,
        customer_count: 0,
        collection_rate: 0,
        average_days_to_collect: null,
      },
      customers: [],
      receivables: [],
    };
  }
};

export const buildLocalMergedCustomers = async (businessId: number): Promise<{ customers: Customer[]; debtTermDays: number }> => {
  try {
    const [baseCustomers, receivablesOverview, invoiceOverview] = await Promise.all([
      readOfflineCustomers(businessId),
      buildLocalReceivablesOverview(businessId),
      buildLocalInvoiceReceivablesOverview(businessId),
    ]);

    const salesSummaryByCustomer = new Map<number, any>(safeArray(receivablesOverview.customers).map((customer: any) => [customer.customer_id, customer]));
    const invoiceSummaryByCustomer = new Map<number, { total_pending: number; overdue_total: number }>();

    safeArray(invoiceOverview.receivables).forEach((item: any) => {
      const customerId = Number(item.customer_id || 0);
      if (!customerId) return;
      const current = invoiceSummaryByCustomer.get(customerId) || { total_pending: 0, overdue_total: 0 };
      current.total_pending += safeNumber(item.pending_balance);
      if (item.status === 'overdue') current.overdue_total += safeNumber(item.pending_balance);
      invoiceSummaryByCustomer.set(customerId, current);
    });

    return {
      customers: safeArray(baseCustomers).map((customer) => {
        const salesSummary = salesSummaryByCustomer.get(customer.id);
        const invoiceSummary = invoiceSummaryByCustomer.get(customer.id);
        const salesBalance = safeNumber(salesSummary?.total_pending);
        const invoiceBalance = safeNumber(invoiceSummary?.total_pending);
        const overdueBalance = safeNumber(salesSummary?.overdue_total) + safeNumber(invoiceSummary?.overdue_total);
        const totalBalance = salesBalance + invoiceBalance;
        return {
          ...customer,
          balance: totalBalance,
          sales_balance: salesBalance,
          invoice_balance: invoiceBalance,
          total_balance: totalBalance,
          overdue_balance: overdueBalance,
          receivable_status: overdueBalance > 0 ? 'overdue' : totalBalance > 0 ? salesSummary?.status || 'current' : customer.receivable_status,
          is_overdue: overdueBalance > 0,
        };
      }),
      debtTermDays: receivablesOverview.settings.default_term_days || 30,
    };
  } catch {
    return {
      customers: [],
      debtTermDays: 30,
    };
  }
};

export const filterLocalSalesByRange = (sales: Sale[], startDate: string, endDate: string) => sales.filter((sale) => {
  return String(sale.status || 'completed').toLowerCase() !== 'cancelled' && isDateWithinRange(sale.sale_date, startDate, endDate);
});

export const filterLocalExpensesByRange = (expenses: Expense[], startDate: string, endDate: string) => expenses.filter((expense) => isDateWithinRange(expense.expense_date, startDate, endDate));
