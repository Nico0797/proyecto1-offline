import { Sale, Customer } from '../types';
import { Payment as StorePayment } from '../store/paymentStore';

export interface ClientReceivable {
  customerId: number;
  customerName: string;
  totalDebt: number;
  overdueDebt: number;
  invoiceCount: number;
  maxDaysOverdue: number;
  lastPaymentDate?: string;
  isOverdue: boolean;
  phone?: string;
}

export interface UnpaidInvoice {
  id: number;
  saleDate: string;
  total: number;
  paidAmount: number;
  balance: number;
  daysOverdue: number;
  isOverdue: boolean;
}

export const computeClientReceivables = (
  customers: Customer[],
  sales: Sale[],
  payments: StorePayment[]
): ClientReceivable[] => {
  // Map to store client stats
  const clientStats = new Map<number, ClientReceivable>();

  // Initialize with customers
  customers.forEach(c => {
    clientStats.set(c.id, {
      customerId: c.id,
      customerName: c.name,
      totalDebt: c.balance || 0, // Trust store balance or recompute? Trust store for now.
      overdueDebt: 0,
      invoiceCount: 0,
      maxDaysOverdue: 0,
      isOverdue: c.is_overdue || false,
      phone: c.phone
    });
  });

  // If we want to be more precise about "overdueDebt" amount (since store might just have total balance),
  // we should iterate sales.
  // However, the store's customer.balance is likely accurate for total.
  // Let's refine overdue debt from sales if available.
  
  const now = new Date();

  sales.forEach(sale => {
    if (sale.balance > 0 && !sale.paid) {
      const stats = clientStats.get(sale.customer_id || 0);
      if (stats) {
        stats.invoiceCount++;
        
        // Calculate days overdue
        const saleDate = new Date(sale.sale_date);
        const diffTime = Math.abs(now.getTime() - saleDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        // Assuming 30 days term for now, or use logic from customer store
        // We will just track max days since sale for now as "days overdue" roughly
        if (diffDays > stats.maxDaysOverdue) {
          stats.maxDaysOverdue = diffDays;
        }

        // If we consider overdue > 30 days (or business setting)
        // For this compute, let's assume if it's marked overdue in customer, it is.
        // But we can sum up specific overdue invoices if we had that granularity.
        // For now, let's assume totalDebt is the main metric.
      }
    }
  });

  // Last payment: map by sale to find customer
  const saleById = new Map<number, Sale>(sales.map(s => [s.id, s]));
  payments.forEach(p => {
    if (!p.sale_id) return;
    const sale = saleById.get(p.sale_id);
    const customerId = sale?.customer_id;
    if (customerId) {
      const stats = clientStats.get(customerId);
      if (stats) {
        if (!stats.lastPaymentDate || new Date(p.payment_date) > new Date(stats.lastPaymentDate)) {
          stats.lastPaymentDate = p.payment_date;
        }
      }
    }
  });

  return Array.from(clientStats.values()).filter(c => c.totalDebt > 0 || c.isOverdue);
};

export const getUnpaidInvoices = (sales: Sale[], customerId: number): UnpaidInvoice[] => {
  const now = new Date();
  return sales
    .filter(s => s.customer_id === customerId && !s.paid && s.balance > 0)
    .map(s => {
      const saleDate = new Date(s.sale_date);
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: s.id,
        saleDate: s.sale_date,
        total: s.total,
        paidAmount: s.total - s.balance,
        balance: s.balance,
        daysOverdue: diffDays, // simplistic
        isOverdue: diffDays > 30 // hardcoded for now, should be from settings
      };
    })
    .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()); // FIFO
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
