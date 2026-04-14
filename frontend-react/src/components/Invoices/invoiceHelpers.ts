import {
  Business,
  Customer,
  Invoice,
  InvoiceCustomerStatement,
  InvoiceItem,
  InvoicePayment,
  InvoiceReceivable,
  InvoiceSettings,
  InvoiceStatus,
} from '../../types';
import { isOfflineProductMode } from '../../runtime/runtimeMode';

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Borrador',
    className: 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
  },
  sent: {
    label: 'Enviada',
    className: 'border border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-200',
  },
  paid: {
    label: 'Pagada',
    className: 'border border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-200',
  },
  partial: {
    label: 'Parcial',
    className: 'border border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200',
  },
  overdue: {
    label: 'Vencida',
    className: 'border border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-200',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200',
  },
};

export const getInvoiceSyncMeta = (
  record?: Pick<Invoice, 'sync_status' | 'is_offline_record'> | Pick<InvoiceReceivable, 'sync_status' | 'is_offline_record'> | null
) => {
  if (isOfflineProductMode()) return null;
  if (!record) return null;
  if (record.sync_status === 'conflicted') {
    return {
      label: 'Conflicto',
      className: 'border border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-700 dark:border-fuchsia-900/30 dark:bg-fuchsia-950/30 dark:text-fuchsia-200',
    };
  }
  if (record.sync_status === 'blocked') {
    return {
      label: 'Bloqueada',
      className: 'border border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }
  if (record.sync_status === 'failed') {
    return {
      label: 'Error de sync',
      className: 'border border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-200',
    };
  }
  if (record.sync_status === 'pending' || record.is_offline_record) {
    return {
      label: 'Pendiente',
      className: 'border border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }
  return null;
};

export const getInvoicePaymentSyncMeta = (
  payment?: { sync_status?: InvoicePayment['sync_status']; is_offline_record?: boolean } | null
) => {
  if (isOfflineProductMode()) return null;
  if (!payment) return null;
  if (payment.sync_status === 'conflicted' || payment.sync_status === 'blocked') {
    return {
      label: 'Pago bloqueado',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
  }
  if (payment.sync_status === 'failed') {
    return {
      label: 'Pago con error',
      className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    };
  }
  if (payment.sync_status === 'pending' || payment.is_offline_record) {
    return {
      label: 'Pago pendiente',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
  }
  return null;
};

export const getInvoicePaymentEventLabel = (payment?: Pick<InvoicePayment, 'event_type'> | null) => {
  const eventType = String(payment?.event_type || 'payment').toLowerCase();
  if (eventType === 'refund') return 'Reembolso';
  if (eventType === 'reversal') return 'Reversion';
  return 'Cobro';
};

export const getInvoicePaymentEventTone = (payment?: Pick<InvoicePayment, 'event_type'> | null) => {
  const eventType = String(payment?.event_type || 'payment').toLowerCase();
  if (eventType === 'refund') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }
  if (eventType === 'reversal') {
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
  }
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
};

export const formatInvoiceMoney = (amount: number, currency = 'COP') =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(Number(amount || 0));

export const formatInvoiceDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const buildInvoiceItemSummary = (items?: InvoiceItem[] | null, limit = 3) => {
  const visibleItems = (items || []).slice(0, limit).map((item) => item.description).filter(Boolean);
  const hiddenCount = Math.max((items || []).length - visibleItems.length, 0);
  const summary = visibleItems.join(', ');
  if (!summary) return null;
  return hiddenCount > 0 ? `${summary} y ${hiddenCount} linea(s) mas` : summary;
};

export const buildInvoiceOfflineShareMessage = (invoice: Invoice) => {
  const lines = [
    `Hola${invoice.customer_name ? ` ${invoice.customer_name}` : ''},`,
    `Te comparto la factura ${invoice.invoice_number}.`,
    `Total: ${formatInvoiceMoney(invoice.total, invoice.currency)}.`,
  ];

  if (invoice.due_date) {
    lines.push(`Vence el ${formatInvoiceDate(invoice.due_date)}.`);
  }
  const itemSummary = buildInvoiceItemSummary(invoice.items);
  if (itemSummary) {
    lines.push(`Conceptos: ${itemSummary}.`);
  }
  if (invoice.notes) {
    lines.push(`Nota: ${invoice.notes}.`);
  }
  return lines.join('\n');
};

export const buildInvoiceOfflineReminderMessage = (
  invoice: Pick<InvoiceReceivable, 'invoice_number' | 'customer_name' | 'balance_due' | 'currency' | 'due_date' | 'notes'> & {
    items?: InvoiceItem[];
  }
) => {
  const lines = [
    `Hola${invoice.customer_name ? ` ${invoice.customer_name}` : ''},`,
    `Te recordamos la factura ${invoice.invoice_number}.`,
    `Saldo pendiente: ${formatInvoiceMoney(invoice.balance_due, invoice.currency)}.`,
  ];

  if (invoice.due_date) {
    lines.push(`Fecha de vencimiento: ${formatInvoiceDate(invoice.due_date)}.`);
  }
  const itemSummary = buildInvoiceItemSummary(invoice.items);
  if (itemSummary) {
    lines.push(`Conceptos: ${itemSummary}.`);
  }
  if (invoice.notes) {
    lines.push(`Nota: ${invoice.notes}.`);
  }
  lines.push('Quedamos atentos para confirmar tu pago. Gracias.');
  return lines.join('\n');
};

export const buildInvoiceStatementOfflineMessage = (statement: InvoiceCustomerStatement, currency = 'COP') => {
  const lines = [
    `Hola${statement.customer.name ? ` ${statement.customer.name}` : ''},`,
    'Te compartimos tu estado de cuenta actualizado.',
    `Facturado: ${formatInvoiceMoney(statement.summary.total_invoiced, currency)}.`,
    `Pagado: ${formatInvoiceMoney(statement.summary.total_paid, currency)}.`,
    `Saldo pendiente: ${formatInvoiceMoney(statement.summary.balance_due, currency)}.`,
  ];
  if (statement.summary.overdue_total > 0.01) {
    lines.push(`Saldo vencido: ${formatInvoiceMoney(statement.summary.overdue_total, currency)}.`);
  }
  if (statement.invoices.length > 0) {
    lines.push(`Facturas abiertas: ${statement.invoices.slice(0, 3).map((invoice) => invoice.invoice_number).join(', ')}.`);
  }
  lines.push('Si necesitas soporte o un comprobante, estamos atentos.');
  return lines.join('\n');
};

export const getInvoiceEditability = (invoice?: Pick<Invoice, 'status' | 'status_base' | 'amount_paid'> | null) => {
  if (!invoice) {
    return { canEdit: true, reason: null as string | null };
  }

  if (invoice.status_base === 'cancelled' || invoice.status === 'cancelled') {
    return {
      canEdit: false,
      reason: 'La factura cancelada queda cerrada. Duplica el documento si necesitas emitir una nueva version.',
    };
  }

  if ((invoice.amount_paid || 0) > 0 || invoice.status === 'partial' || invoice.status === 'paid') {
    return {
      canEdit: false,
      reason: 'La factura tiene pagos registrados y ya no se puede editar para proteger los totales y el historial.',
    };
  }

  return { canEdit: true, reason: null as string | null };
};

export const getInvoicePaymentState = (
  invoice?: Pick<Invoice, 'status' | 'status_base' | 'outstanding_balance'> | null
) => {
  if (!invoice) {
    return { canRecordPayment: false, reason: 'Cargando factura...' };
  }

  if (invoice.status_base === 'cancelled' || invoice.status === 'cancelled') {
    return { canRecordPayment: false, reason: 'Las facturas canceladas no aceptan pagos.' };
  }

  if ((invoice.outstanding_balance || 0) <= 0.01 || invoice.status === 'paid') {
    return { canRecordPayment: false, reason: 'La factura ya esta completamente pagada.' };
  }

  if (invoice.status_base === 'draft' || invoice.status === 'draft') {
    return { canRecordPayment: false, reason: 'Marca la factura como enviada antes de registrar pagos.' };
  }

  return { canRecordPayment: true, reason: null as string | null };
};

export const getInvoiceCollectionLabel = (
  invoice?: Pick<InvoiceReceivable, 'status' | 'days_overdue' | 'days_until_due' | 'balance_due'> | null
) => {
  if (!invoice) return 'Sin informacion';
  if ((invoice.balance_due || 0) <= 0.01 || invoice.status === 'paid') return 'Sin saldo pendiente';
  if (invoice.status === 'cancelled') return 'Documento cancelado';
  if (invoice.status === 'overdue') {
    return invoice.days_overdue > 0 ? `Vencida hace ${invoice.days_overdue} dia(s)` : 'Vencida';
  }
  if (invoice.status === 'partial') {
    if (invoice.days_until_due === 0) return 'Abono registrado, vence hoy';
    if ((invoice.days_until_due || 0) < 0) return `Abono registrado, vencida hace ${Math.abs(invoice.days_until_due || 0)} dia(s)`;
    if (invoice.days_until_due) return `Abono registrado, vence en ${invoice.days_until_due} dia(s)`;
    return 'Abono registrado';
  }
  if (invoice.days_until_due === 0) return 'Vence hoy';
  if ((invoice.days_until_due || 0) < 0) return `Vencida hace ${Math.abs(invoice.days_until_due || 0)} dia(s)`;
  if (invoice.days_until_due) return `Vence en ${invoice.days_until_due} dia(s)`;
  return 'Pendiente por cobrar';
};

export const getInvoiceCollectionTone = (
  invoice?: Pick<InvoiceReceivable, 'status' | 'balance_due' | 'days_overdue'> | null
) => {
  if (!invoice) {
    return {
      badgeClassName: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      textClassName: 'text-gray-500 dark:text-gray-400',
    };
  }
  if ((invoice.balance_due || 0) <= 0.01 || invoice.status === 'paid') {
    return {
      badgeClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      textClassName: 'text-emerald-700 dark:text-emerald-300',
    };
  }
  if (invoice.status === 'overdue' || (invoice.days_overdue || 0) > 0) {
    return {
      badgeClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      textClassName: 'text-rose-700 dark:text-rose-300',
    };
  }
  if (invoice.status === 'partial') {
    return {
      badgeClassName: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      textClassName: 'text-amber-700 dark:text-amber-300',
    };
  }
  if (invoice.status === 'cancelled') {
    return {
      badgeClassName: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      textClassName: 'text-zinc-600 dark:text-zinc-300',
    };
  }
  return {
    badgeClassName: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    textClassName: 'text-blue-700 dark:text-blue-300',
  };
};

export const calculateInvoiceTotals = (items: InvoiceItem[]) => {
  return items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const discount = Number(item.discount || 0);
      const taxRate = Number(item.tax_rate || 0);
      const subtotal = quantity * unitPrice;
      const taxable = Math.max(subtotal - discount, 0);
      const tax = taxable * (taxRate / 100);
      const lineTotal = taxable + tax;

      acc.subtotal += subtotal;
      acc.discountTotal += discount;
      acc.taxTotal += tax;
      acc.total += lineTotal;
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 }
  );
};

export const buildPreviewInvoice = ({
  business,
  customer,
  settings,
  values,
}: {
  business: Business | null;
  customer: Customer | null;
  settings: InvoiceSettings | null;
  values: Partial<Invoice> & { items: InvoiceItem[] };
}) => {
  const totals = calculateInvoiceTotals(values.items || []);
  return {
    id: values.id || 0,
    business_id: business?.id || 0,
    customer_id: customer?.id || values.customer_id || null,
    customer_name: customer?.name || values.customer_name || null,
    customer_phone: customer?.phone || values.customer_phone || null,
    customer_address: customer?.address || values.customer_address || null,
    invoice_number: values.invoice_number || `${settings?.prefix || 'INV'}-BORRADOR`,
    status: (values.status || 'draft') as InvoiceStatus,
    issue_date: values.issue_date || new Date().toISOString().split('T')[0],
    due_date: values.due_date || null,
    currency: values.currency || business?.currency || 'COP',
    subtotal: Number(values.subtotal ?? totals.subtotal),
    discount_total: Number(values.discount_total ?? totals.discountTotal),
    tax_total: Number(values.tax_total ?? totals.taxTotal),
    total: Number(values.total ?? totals.total),
    amount_paid: Number(values.amount_paid || 0),
    outstanding_balance: Number(values.outstanding_balance ?? totals.total),
    notes: values.notes || settings?.default_notes || null,
    payment_method: values.payment_method || null,
    items: values.items || [],
    payments: values.payments || [],
  } as Invoice;
};
