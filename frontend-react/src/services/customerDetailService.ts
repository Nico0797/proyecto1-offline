import api from './api';
import { customerRepository } from '../repositories/customerRepository';
import {
  Customer,
  CustomerCommercialSummary,
  CustomerHistoryEntry,
  CustomerHistoryResponse,
  Invoice,
  Payment,
  Sale,
} from '../types';
import { readOfflineInvoices, readOfflinePayments, readOfflineSales } from './offlineLocalData';

const safeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTimestamp = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const matchesCustomer = (customerId: number, customerName: string, recordCustomerId?: number | null, recordCustomerName?: string | null) => {
  if (Number(recordCustomerId || 0) === customerId) return true;
  return String(recordCustomerName || '').trim().toLowerCase() === customerName.trim().toLowerCase();
};

const buildCustomerStatus = (
  outstandingBalance: number,
  hasCommercialActivity: boolean,
  fallbackStatus?: string | null,
  fallbackLabel?: string | null,
) => {
  if (outstandingBalance > 0.01) {
    return { status: 'with_balance', label: 'Con saldo pendiente' };
  }
  if (hasCommercialActivity) {
    return { status: 'active', label: 'Activo' };
  }
  return {
    status: fallbackStatus || 'new',
    label: fallbackLabel || 'Sin movimientos',
  };
};

const buildLocalCommercialSummary = (
  customer: Customer,
  sales: Sale[],
  payments: Payment[],
  invoices: Invoice[],
): CustomerCommercialSummary => {
  const summaryBase = customer.commercial_summary;
  const invoicePayments = invoices.flatMap((invoice) =>
    Array.isArray(invoice.payments)
      ? invoice.payments.map((payment) => ({
          ...payment,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        }))
      : [],
  );

  const sortedSales = [...sales].sort(
    (left, right) => toTimestamp(right.sale_date || right.created_at) - toTimestamp(left.sale_date || left.created_at),
  );
  const sortedInvoices = [...invoices].sort(
    (left, right) => toTimestamp(right.issue_date || right.created_at) - toTimestamp(left.issue_date || left.created_at),
  );

  const salesTotal = sales.reduce((sum, sale) => sum + safeNumber(sale.total), 0);
  const invoiceTotal = invoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0);
  const paymentsTotal = payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
  const invoicePaymentsTotal = invoicePayments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);

  const lastActivityDate = [
    customer.last_activity_date,
    sortedSales[0]?.sale_date || sortedSales[0]?.created_at,
    sortedInvoices[0]?.issue_date || sortedInvoices[0]?.created_at,
    ...payments.map((payment) => payment.payment_date || payment.created_at || null),
    ...invoicePayments.map((payment) => payment.payment_date || payment.created_at || null),
  ]
    .map((value) => ({ value, time: toTimestamp(value) }))
    .sort((left, right) => right.time - left.time)[0]?.value;

  const outstandingBalance = safeNumber(customer.total_balance ?? customer.balance);
  const status = buildCustomerStatus(
    outstandingBalance,
    sales.length > 0 || payments.length > 0 || invoices.length > 0,
    summaryBase?.customer_status || customer.customer_status,
    summaryBase?.customer_status_label || customer.customer_status_label,
  );

  return {
    total_purchases_value: sales.length > 0 ? salesTotal : safeNumber(summaryBase?.total_purchases_value ?? customer.total_purchases_value),
    total_purchases_count: sales.length > 0 ? sales.length : safeNumber(summaryBase?.total_purchases_count ?? customer.total_purchases_count),
    last_purchase_date:
      sortedSales[0]?.sale_date ||
      sortedSales[0]?.created_at ||
      summaryBase?.last_purchase_date ||
      customer.last_purchase_date ||
      null,
    last_purchase_value: sortedSales[0] ? safeNumber(sortedSales[0].total) : safeNumber(summaryBase?.last_purchase_value ?? customer.last_purchase_value),
    outstanding_balance: outstandingBalance,
    sales_outstanding_balance: safeNumber(customer.sales_balance ?? summaryBase?.sales_outstanding_balance),
    invoice_outstanding_balance: safeNumber(customer.invoice_balance ?? summaryBase?.invoice_outstanding_balance),
    total_paid:
      payments.length > 0 || invoicePayments.length > 0
        ? paymentsTotal + invoicePaymentsTotal
        : safeNumber(summaryBase?.total_paid ?? customer.total_paid),
    average_ticket:
      sales.length > 0
        ? salesTotal / Math.max(sales.length, 1)
        : safeNumber(summaryBase?.average_ticket ?? customer.average_ticket),
    customer_status: status.status,
    customer_status_label: status.label,
    sales_count: sales.length > 0 ? sales.length : safeNumber(summaryBase?.sales_count ?? customer.sales_count),
    sales_total: sales.length > 0 ? salesTotal : safeNumber(summaryBase?.sales_total ?? customer.sales_total),
    payment_count:
      payments.length > 0 ? payments.length : safeNumber(summaryBase?.payment_count ?? customer.payment_count),
    orders_count: safeNumber(summaryBase?.orders_count ?? customer.orders_count),
    orders_total: safeNumber(summaryBase?.orders_total ?? customer.orders_total),
    last_order_date: summaryBase?.last_order_date ?? customer.last_order_date ?? null,
    last_order_value: safeNumber(summaryBase?.last_order_value ?? customer.last_order_value),
    invoice_count: invoices.length > 0 ? invoices.length : safeNumber(summaryBase?.invoice_count ?? customer.invoice_count),
    invoice_total: invoices.length > 0 ? invoiceTotal : safeNumber(summaryBase?.invoice_total ?? customer.invoice_total),
    invoice_payment_count:
      invoicePayments.length > 0
        ? invoicePayments.length
        : safeNumber(summaryBase?.invoice_payment_count ?? customer.invoice_payment_count),
    last_activity_date: lastActivityDate || summaryBase?.last_activity_date || customer.last_activity_date || null,
  };
};

const buildHistoryEntryDate = (...values: Array<string | null | undefined>) =>
  values.find((value) => Boolean(toIsoDate(value))) || null;

const buildLocalHistory = (
  customerId: number,
  sales: Sale[],
  payments: Payment[],
  invoices: Invoice[],
): CustomerHistoryEntry[] => {
  const saleEntries: CustomerHistoryEntry[] = sales.map((sale) => ({
    id: `sale-${sale.id}`,
    entry_type: 'sale',
    date: buildHistoryEntryDate(sale.sale_date, sale.created_at),
    document_id: sale.id,
    document_label: `Venta #${sale.id}`,
    title: `Venta #${sale.id}`,
    subtitle: sale.items?.length ? `${sale.items.length} item(s)` : 'Venta registrada',
    amount: safeNumber(sale.total),
    signed_amount: safeNumber(sale.total),
    balance: safeNumber(sale.balance),
    status: sale.status || (sale.paid ? 'paid' : 'pending'),
    note: sale.note || null,
    related_sale_id: sale.id,
  }));

  const customerSaleIds = new Set(sales.map((sale) => sale.id));
  const paymentEntries: CustomerHistoryEntry[] = payments
    .filter((payment) => Number(payment.customer_id || 0) === customerId || customerSaleIds.has(Number(payment.sale_id || 0)))
    .map((payment) => ({
      id: `payment-${payment.id}`,
      entry_type: 'payment',
      date: buildHistoryEntryDate(payment.payment_date, payment.created_at),
      document_id: payment.id,
      document_label: payment.sale_id ? `Pago venta #${payment.sale_id}` : `Pago #${payment.id}`,
      title: 'Pago recibido',
      subtitle: payment.payment_method || payment.method || 'Abono registrado',
      amount: safeNumber(payment.amount),
      signed_amount: safeNumber(payment.amount),
      balance: null,
      status: 'completed',
      note: payment.note || null,
      related_sale_id: payment.sale_id || null,
      treasury_account_name: payment.treasury_account_name || null,
    }));

  const invoiceEntries: CustomerHistoryEntry[] = invoices.flatMap((invoice) => {
    const baseEntries: CustomerHistoryEntry[] = [
      {
        id: `invoice-${invoice.id}`,
        entry_type: 'invoice',
        date: buildHistoryEntryDate(invoice.issue_date, invoice.created_at),
        document_id: invoice.id,
        document_label: invoice.invoice_number || `Factura #${invoice.id}`,
        title: invoice.invoice_number || `Factura #${invoice.id}`,
        subtitle: invoice.status ? `Estado: ${invoice.status}` : 'Factura emitida',
        amount: safeNumber(invoice.total),
        signed_amount: safeNumber(invoice.total),
        balance: safeNumber(invoice.outstanding_balance),
        status: invoice.status || 'issued',
        note: invoice.notes || null,
        related_invoice_id: invoice.id,
      },
    ];

    const paymentHistory = Array.isArray(invoice.payments)
      ? invoice.payments.map((payment, index) => ({
          id: `invoice-payment-${invoice.id}-${payment.id || index}`,
          entry_type: 'invoice_payment',
          date: buildHistoryEntryDate(payment.payment_date, payment.created_at, invoice.issue_date),
          document_id: payment.id || `${invoice.id}-${index}`,
          document_label: invoice.invoice_number || `Factura #${invoice.id}`,
          title: 'Abono a factura',
          subtitle: invoice.invoice_number || `Factura #${invoice.id}`,
          amount: safeNumber(payment.amount),
          signed_amount: safeNumber(payment.amount),
          balance: null,
          status: 'completed',
          note: payment.notes || null,
          related_invoice_id: invoice.id,
          treasury_account_name: payment.treasury_account_name || null,
        }))
      : [];

    return [...baseEntries, ...paymentHistory];
  });

  return [...saleEntries, ...paymentEntries, ...invoiceEntries]
    .filter((entry) => Boolean(entry.id))
    .sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date));
};

const buildLocalCustomerDetail = async (businessId: number, customerId: number): Promise<Customer> => {
  const { customers } = await customerRepository.list(businessId);
  const customer = customers.find((item) => item.id === customerId);

  if (!customer) {
    throw new Error('Cliente no encontrado');
  }

  const [sales, payments, invoices] = await Promise.all([
    readOfflineSales(businessId),
    readOfflinePayments(businessId),
    readOfflineInvoices(businessId),
  ]);

  const customerSales = sales.filter((sale) => matchesCustomer(customerId, customer.name, sale.customer_id, sale.customer_name));
  const customerPayments = payments.filter((payment) => matchesCustomer(customerId, customer.name, payment.customer_id, payment.customer_name));
  const customerInvoices = invoices.filter((invoice) => matchesCustomer(customerId, customer.name, invoice.customer_id, invoice.customer_name));

  const commercialSummary = buildLocalCommercialSummary(customer, customerSales, customerPayments, customerInvoices);

  return {
    ...customer,
    total_purchases_value: commercialSummary.total_purchases_value,
    total_purchases_count: commercialSummary.total_purchases_count,
    last_purchase_date: commercialSummary.last_purchase_date,
    last_purchase_value: commercialSummary.last_purchase_value,
    total_paid: commercialSummary.total_paid,
    average_ticket: commercialSummary.average_ticket,
    customer_status: commercialSummary.customer_status,
    customer_status_label: commercialSummary.customer_status_label,
    sales_count: commercialSummary.sales_count,
    sales_total: commercialSummary.sales_total,
    payment_count: commercialSummary.payment_count,
    orders_count: commercialSummary.orders_count,
    orders_total: commercialSummary.orders_total,
    last_order_date: commercialSummary.last_order_date,
    last_order_value: commercialSummary.last_order_value,
    invoice_count: commercialSummary.invoice_count,
    invoice_total: commercialSummary.invoice_total,
    invoice_payment_count: commercialSummary.invoice_payment_count,
    last_activity_date: commercialSummary.last_activity_date,
    commercial_summary: commercialSummary,
  };
};

const buildLocalCustomerHistory = async (
  businessId: number,
  customerId: number,
  params?: { page?: number; per_page?: number },
): Promise<CustomerHistoryResponse> => {
  const customer = await buildLocalCustomerDetail(businessId, customerId);
  const [sales, payments, invoices] = await Promise.all([
    readOfflineSales(businessId),
    readOfflinePayments(businessId),
    readOfflineInvoices(businessId),
  ]);

  const customerSales = sales.filter((sale) => matchesCustomer(customerId, customer.name, sale.customer_id, sale.customer_name));
  const customerPayments = payments.filter((payment) => matchesCustomer(customerId, customer.name, payment.customer_id, payment.customer_name));
  const customerInvoices = invoices.filter((invoice) => matchesCustomer(customerId, customer.name, invoice.customer_id, invoice.customer_name));

  const history = buildLocalHistory(customerId, customerSales, customerPayments, customerInvoices);
  const page = Math.max(1, Number(params?.page || 1));
  const perPage = Math.max(1, Number(params?.per_page || 12));
  const startIndex = (page - 1) * perPage;
  const pagedHistory = history.slice(startIndex, startIndex + perPage);
  const total = history.length;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return {
    customer_id: customerId,
    history: pagedHistory,
    pagination: {
      page,
      per_page: perPage,
      total,
      pages,
      has_more: page < pages,
    },
  };
};

export const customerDetailService = {
  async getCustomerDetail(businessId: number, customerId: number): Promise<Customer> {
    try {
      const response = await api.get(`/businesses/${businessId}/customers/${customerId}`);
      return response.data.customer;
    } catch (error) {
      return buildLocalCustomerDetail(businessId, customerId).catch(() => {
        throw error;
      });
    }
  },

  async getCustomerHistory(
    businessId: number,
    customerId: number,
    params?: { page?: number; per_page?: number },
  ): Promise<CustomerHistoryResponse> {
    try {
      const response = await api.get(`/businesses/${businessId}/customers/${customerId}/history`, {
        params,
      });
      return response.data;
    } catch (error) {
      return buildLocalCustomerHistory(businessId, customerId, params).catch(() => {
        throw error;
      });
    }
  },
};
