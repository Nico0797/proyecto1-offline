import api from './api';
import { Customer, Sale, Product } from '../types';
import { RecurringExpense } from '../store/recurringExpenseStore';

export type AlertType = 'receivable' | 'recurring' | 'inventory' | 'goal' | 'system';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'snoozed' | 'resolved';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  dueDate?: string;
  entityId?: number | string;
  entityType?: 'customer' | 'product' | 'recurring' | 'goal' | 'system';
  createdAt: string;
  data?: any;
}

const daysBetween = (a: Date, b: Date) => Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

export const alertsService = {
  async buildAlerts(businessId: number, opts?: { lookaheadDays?: number; dueSoonDays?: number; stockThreshold?: number }) {
    if (!localStorage.getItem('token')) return [];
    const lookahead = opts?.lookaheadDays ?? 7;
    const dueSoon = opts?.dueSoonDays ?? 7;
    const stockTh = opts?.stockThreshold ?? 5;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [salesRes, customersRes, _expensesRes, productsRes, recurringRes, ordersRes] = await Promise.all([
      api.get(`/businesses/${businessId}/sales`),
      api.get(`/businesses/${businessId}/customers`),
      api.get(`/businesses/${businessId}/expenses`, { params: { start_date: start, end_date: end } }),
      api.get(`/businesses/${businessId}/products`),
      api.get(`/businesses/${businessId}/recurring-expenses`).catch(() => ({ data: { recurring_expenses: [] } })),
      api.get(`/businesses/${businessId}/orders`).catch(() => ({ data: { orders: [] } }))
    ]);

    const sales: Sale[] = salesRes.data?.sales || [];
    const customers: Customer[] = customersRes.data?.customers || [];
    const products: Product[] = productsRes.data?.products || [];
    const recurring: RecurringExpense[] = recurringRes.data?.recurring_expenses || [];

    // Orders fetch might fail or return different structure, normalize it
    let orders: any[] = [];
    if (ordersRes && ordersRes.data && Array.isArray(ordersRes.data.orders)) {
      orders = ordersRes.data.orders;
    } else if (Array.isArray(ordersRes?.data)) {
      orders = ordersRes.data;
    }

    const receivableAlerts: Alert[] = [];
    const saleByCustomer = new Map<number, Sale[]>();
    sales.forEach(s => {
      if (s.customer_id) {
        const arr = saleByCustomer.get(s.customer_id) || [];
        arr.push(s);
        saleByCustomer.set(s.customer_id, arr);
      }
    });

    customers.forEach(c => {
      const balance = c.balance || 0;
      if (balance <= 0) return;
      const saleList = saleByCustomer.get(c.id) || [];
      const oldest = saleList.filter(s => !s.paid && s.balance > 0).sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())[0];
      const dueDate = oldest ? oldest.sale_date : c.oldest_due_date || new Date().toISOString().split('T')[0];
      const d = new Date(dueDate);
      const days = daysBetween(today, d);
      const isOverdue = days > 30 ? true : c.is_overdue || false;
      const severity: AlertSeverity = isOverdue ? 'critical' : days > 23 ? 'warning' : 'info';
      receivableAlerts.push({
        id: `ar_${c.id}`,
        type: 'receivable',
        severity,
        status: 'active',
        title: isOverdue ? `Vencido: ${c.name}` : `Por vencer: ${c.name}`,
        description: `Saldo $${balance.toLocaleString()}${isOverdue ? `, atraso ${days}d` : ''}`,
        dueDate: dueDate,
        entityId: c.id,
        entityType: 'customer',
        createdAt: new Date().toISOString(),
        data: { customer: c, daysLate: days, balance }
      });
    });

    const recurringAlerts: Alert[] = [];
    recurring.forEach(r => {
      if (!r.is_active) return;
      const next = r.next_due_date ? new Date(r.next_due_date) : null;
      if (!next) return;
      const diff = daysBetween(next, today);
      if (diff < -lookahead) return;
      const overdue = diff < 0;
      const soon = !overdue && diff <= dueSoon;
      if (!overdue && !soon) return;
      recurringAlerts.push({
        id: `rec_${r.id}`,
        type: 'recurring',
        severity: overdue ? 'warning' : 'info',
        status: 'active',
        title: overdue ? `Recurrente vencido: ${r.name}` : `Recurrente próximo: ${r.name}`,
        description: `$${r.amount.toLocaleString()} • ${r.category || 'Recurrente'}`,
        dueDate: r.next_due_date,
        entityId: r.id,
        entityType: 'recurring',
        createdAt: new Date().toISOString(),
        data: { recurring: r, overdue, daysToDue: diff }
      });
    });

    // Build a commitment map from pending orders: product_id -> committed quantity
    const committedByProduct = new Map<number, number>();
    if (Array.isArray(orders)) {
        orders.forEach((o: any) => {
          // Check status: pending orders consume stock availability
          // We include 'confirmed' if that status exists, or just 'pending'
          // And we also want to catch orders that might not have a status yet but exist
          const st = o.status || 'pending';
          if (st === 'pending' || st === 'confirmed' || st === 'processing') {
            const items = Array.isArray(o.items) ? o.items : [];
            items.forEach((it: any) => {
              // Normalize product ID from different possible shapes
              const pid = it.product_id ?? it.productId ?? it.id;
              const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
              if (typeof pid === 'number') {
                committedByProduct.set(pid, (committedByProduct.get(pid) || 0) + qty);
              }
            });
          }
        });
    }

    const inventoryAlerts: Alert[] = [];
    products.forEach(p => {
      // Skip services
      // @ts-ignore defensive: some backends may not include type
      if (p.type === 'service') return;
      const th = (p as any).low_stock_threshold || stockTh;
      const committed = committedByProduct.get((p as any).id) || 0;
      const available = (p as any).stock - committed;
      if (available <= 0 || available <= th) {
        const critical = available <= 0;
        inventoryAlerts.push({
          id: `inv_${(p as any).id}`,
          type: 'inventory',
          severity: critical ? 'critical' : 'warning',
          status: 'active',
          title: critical ? `Sin stock disponible: ${(p as any).name}` : `Stock comprometido: ${(p as any).name}`,
          description: `Disponible ${Math.max(available, 0)} • Stock ${ (p as any).stock } • Reservado ${committed} • Umbral ${th}`,
          entityId: (p as any).id,
          entityType: 'product',
          createdAt: new Date().toISOString(),
          data: { product: p, committed, available, threshold: th }
        });
      }
    });

    const all = [...receivableAlerts, ...recurringAlerts, ...inventoryAlerts];
    all.sort((a, b) => {
      const sev = (s: AlertSeverity) => (s === 'critical' ? 0 : s === 'warning' ? 1 : 2);
      const sa = sev(a.severity);
      const sb = sev(b.severity);
      if (sa !== sb) return sa - sb;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return da - db || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return all;
  }
};
