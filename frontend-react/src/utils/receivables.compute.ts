import { ReceivableItem, ReceivablesOverview } from '../types';

export interface ClientReceivable {
  customerId: number;
  customerName: string;
  totalDebt: number;
  overdueDebt: number;
  dueSoonDebt: number;
  dueTodayDebt: number;
  currentDebt: number;
  invoiceCount: number;
  maxDaysOverdue: number;
  isOverdue: boolean;
  phone?: string;
  nearestDueDate?: string;
  oldestBaseDate?: string;
  status: string;
  statusLabel: string;
  receivables: ReceivableItem[];
}

export interface UnpaidInvoice {
  id: number;
  saleDate: string;
  dueDate: string;
  termDays: number;
  total: number;
  paidAmount: number;
  balance: number;
  daysOverdue: number;
  daysUntilDue: number;
  isOverdue: boolean;
  status: string;
  statusLabel: string;
}

export const computeClientReceivables = (
  overview: ReceivablesOverview | null
): ClientReceivable[] => {
  if (!overview) {
    return [];
  }

  const clientStats = new Map<number, ClientReceivable>();

  overview.customers.forEach((customer) => {
    clientStats.set(customer.customer_id, {
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      totalDebt: customer.total_balance,
      overdueDebt: customer.overdue_balance,
      dueSoonDebt: customer.due_soon_balance,
      dueTodayDebt: customer.due_today_balance,
      currentDebt: customer.current_balance,
      invoiceCount: customer.invoice_count,
      maxDaysOverdue: customer.max_days_overdue,
      isOverdue: customer.status === 'overdue',
      phone: customer.customer_phone || undefined,
      nearestDueDate: customer.nearest_due_date || undefined,
      oldestBaseDate: customer.oldest_base_date || undefined,
      status: customer.status,
      statusLabel: customer.status_label,
      receivables: [],
    });
  });

  overview.receivables.forEach((receivable) => {
    const stats = clientStats.get(receivable.customer_id);
    if (stats) {
      stats.receivables.push(receivable);
    }
  });

  return Array.from(clientStats.values()).filter((client) => client.totalDebt > 0);
};

export const getUnpaidInvoices = (receivables: ReceivableItem[], customerId: number): UnpaidInvoice[] => {
  return receivables
    .filter((item) => item.customer_id === customerId && item.pending_balance > 0)
    .map((item) => ({
      id: item.sale_id,
      saleDate: item.base_date,
      dueDate: item.due_date,
      termDays: item.term_days,
      total: item.original_amount,
      paidAmount: item.total_paid,
      balance: item.pending_balance,
      daysOverdue: item.days_overdue,
      daysUntilDue: item.days_until_due,
      isOverdue: item.status === 'overdue',
      status: item.status,
      statusLabel: item.status_label,
    }))
    .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
};

export const allocatePayment = (
  amount: number, 
  invoices: UnpaidInvoice[]
): Map<number, number> => {
  const allocation = new Map<number, number>();
  let remaining = amount;

  for (const invoice of invoices) {
    if (remaining <= 0) break;
    
    const toPay = Math.min(remaining, invoice.balance);
    allocation.set(invoice.id, toPay);
    remaining -= toPay;
  }

  return allocation;
};
