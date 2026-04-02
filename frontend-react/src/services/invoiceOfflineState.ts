import type {
  Customer,
  Invoice,
  InvoiceCustomerStatement,
  InvoiceItem,
  InvoicePayment,
  InvoiceReceivable,
  InvoiceReceivablesCustomerSummary,
  InvoiceReceivablesOverview,
  Product,
  ReceivableStatus,
} from '../types';

type InvoiceReferenceMaps = {
  customers: Map<number, Customer>;
  products: Map<number, Product>;
};

type BuildInvoiceOptions = {
  baseInvoice?: Invoice | null;
  invoiceId: number;
  clientOperationId: string;
  businessId: number;
  currency?: string;
  createdAt?: string;
  currentUserName?: string | null;
  numberPrefix?: string;
  now?: Date;
};

type BuildInvoicePaymentOptions = {
  paymentId: number;
  clientOperationId: string;
  currentUserName?: string | null;
  now?: Date;
};

const roundCurrency = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toIsoDate = (value?: string | null, fallback?: string) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  if (fallback) return fallback;
  return new Date().toISOString().split('T')[0];
};

const parseIsoDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatQuantity = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

const normalizeInvoiceItem = (
  rawItem: Record<string, any>,
  index: number,
  references: InvoiceReferenceMaps
): InvoiceItem => {
  const quantity = Number(rawItem.quantity ?? 0);
  const unitPrice = Number(rawItem.unit_price ?? 0);
  const discount = Number(rawItem.discount ?? 0);
  const taxRate = Number(rawItem.tax_rate ?? 0);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`La cantidad del item #${index + 1} debe ser mayor a cero`);
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error(`El precio unitario del item #${index + 1} es invalido`);
  }
  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error(`El descuento del item #${index + 1} es invalido`);
  }
  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw new Error(`El impuesto del item #${index + 1} es invalido`);
  }

  const subtotal = roundCurrency(quantity * unitPrice);
  if (discount > subtotal + 0.01) {
    throw new Error(`El descuento del item #${index + 1} no puede superar el subtotal`);
  }

  const taxable = roundCurrency(Math.max(subtotal - discount, 0));
  const tax = roundCurrency(taxable * (taxRate / 100));
  const productId = rawItem.product_id == null || rawItem.product_id === '' ? null : Number(rawItem.product_id);
  const product = productId != null ? references.products.get(productId) : null;
  const description = String(rawItem.description || product?.name || '').trim();

  if (!description) {
    throw new Error(`El item #${index + 1} necesita una descripcion`);
  }

  return {
    id: rawItem.id,
    invoice_id: rawItem.invoice_id,
    product_id: productId,
    product_name: rawItem.product_name || product?.name || null,
    description,
    quantity,
    unit_price: unitPrice,
    discount,
    tax_rate: taxRate,
    line_total: roundCurrency(taxable + tax),
    sort_order: rawItem.sort_order ?? index,
  };
};

const calculateInvoiceTotals = (items: InvoiceItem[]) => items.reduce((acc, item) => {
  const subtotal = roundCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0));
  const discount = roundCurrency(Number(item.discount || 0));
  const taxable = roundCurrency(Math.max(subtotal - discount, 0));
  const tax = roundCurrency(taxable * (Number(item.tax_rate || 0) / 100));

  acc.subtotal = roundCurrency(acc.subtotal + subtotal);
  acc.discount_total = roundCurrency(acc.discount_total + discount);
  acc.tax_total = roundCurrency(acc.tax_total + tax);
  acc.total = roundCurrency(acc.total + taxable + tax);
  return acc;
}, {
  subtotal: 0,
  discount_total: 0,
  tax_total: 0,
  total: 0,
});

const deriveInvoiceFinancialState = (
  statusBase: Invoice['status'],
  total: number,
  paidAmount: number,
  dueDate?: string | null,
  today = new Date()
) => {
  const currentDate = new Date(today);
  currentDate.setHours(0, 0, 0, 0);
  const balance = roundCurrency(Math.max(total - paidAmount, 0));
  const parsedDueDate = parseIsoDate(dueDate);
  const daysUntilDue = parsedDueDate
    ? Math.ceil((parsedDueDate.getTime() - currentDate.getTime()) / 86400000)
    : null;
  const isOverdue = Boolean(
    statusBase !== 'draft'
    && statusBase !== 'cancelled'
    && balance > 0.01
    && parsedDueDate
    && parsedDueDate.getTime() < currentDate.getTime()
  );

  let status: Invoice['status'] = statusBase;
  if (statusBase !== 'cancelled') {
    if (balance <= 0.01 && total > 0) {
      status = 'paid';
    } else if (paidAmount > 0.01 && balance > 0.01) {
      status = 'partial';
    } else if (isOverdue) {
      status = 'overdue';
    } else {
      status = statusBase;
    }
  }

  return {
    status,
    status_base: statusBase,
    amount_paid: roundCurrency(paidAmount),
    outstanding_balance: balance,
    is_overdue: isOverdue,
    days_until_due: daysUntilDue,
  };
};

export const getOfflineInvoiceEditLockReason = (invoice: Invoice | null | undefined) => {
  if (!invoice) return null;
  if (invoice.status_base === 'cancelled' || invoice.status === 'cancelled') {
    return 'La factura cancelada queda cerrada. Duplica el documento si necesitas emitir una nueva version.';
  }
  if ((invoice.amount_paid || 0) > 0.01 || invoice.status === 'partial' || invoice.status === 'paid') {
    return 'La factura tiene pagos registrados y ya no se puede editar para proteger los totales y el historial.';
  }
  return null;
};

export const buildOfflineInvoiceRecord = (
  references: InvoiceReferenceMaps,
  payload: Record<string, any>,
  options: BuildInvoiceOptions
): Invoice => {
  const now = options.now || new Date();
  const baseInvoice = options.baseInvoice || null;
  const lockedReason = getOfflineInvoiceEditLockReason(baseInvoice);
  if (lockedReason) {
    throw new Error(lockedReason);
  }

  const issueDate = toIsoDate(payload.issue_date, baseInvoice?.issue_date || undefined);
  if (!issueDate) {
    throw new Error('La fecha de emision es obligatoria');
  }

  const dueDate = Object.prototype.hasOwnProperty.call(payload, 'due_date')
    ? (payload.due_date ? toIsoDate(payload.due_date) : null)
    : (baseInvoice?.due_date || null);

  const issueDateValue = parseIsoDate(issueDate);
  const dueDateValue = parseIsoDate(dueDate);
  if (!issueDateValue) {
    throw new Error('La fecha de emision es invalida');
  }
  if (dueDate && !dueDateValue) {
    throw new Error('La fecha de vencimiento es invalida');
  }
  if (issueDateValue && dueDateValue && dueDateValue.getTime() < issueDateValue.getTime()) {
    throw new Error('La fecha de vencimiento no puede ser anterior a la fecha de emision');
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : baseInvoice?.items || [];
  if (rawItems.length === 0) {
    throw new Error('Debes agregar al menos un item a la factura');
  }
  const items = rawItems.map((item, index) => normalizeInvoiceItem(item, index, references));
  const totals = calculateInvoiceTotals(items);
  const payments = Array.isArray(baseInvoice?.payments) ? baseInvoice!.payments.map((payment) => ({ ...payment })) : [];
  const paidAmount = roundCurrency(payments.reduce((sum, payment) => sum + getInvoicePaymentSignedAmount(payment), 0));

  const requestedStatus = String(payload.status || baseInvoice?.status_base || baseInvoice?.status || 'draft').trim().toLowerCase();
  const statusBase = (requestedStatus === 'sent' || requestedStatus === 'cancelled' || requestedStatus === 'draft'
    ? requestedStatus
    : 'draft') as Invoice['status'];

  const customerId = Object.prototype.hasOwnProperty.call(payload, 'customer_id')
    ? (payload.customer_id == null || payload.customer_id === '' ? null : Number(payload.customer_id))
    : (baseInvoice?.customer_id ?? null);
  const customer = customerId != null ? references.customers.get(customerId) : null;
  const numberPrefix = options.numberPrefix || 'INV';
  const invoiceNumber = baseInvoice?.invoice_number
    || `${numberPrefix}-PEND-${String(Math.abs(options.invoiceId)).slice(-6)}`;

  const financialState = deriveInvoiceFinancialState(statusBase, totals.total, paidAmount, dueDate, now);

  return {
    id: options.invoiceId,
    business_id: options.businessId,
    customer_id: customerId,
    customer_name: customer?.name || baseInvoice?.customer_name || null,
    customer_phone: customer?.phone || baseInvoice?.customer_phone || null,
    customer_address: customer?.address || baseInvoice?.customer_address || null,
    invoice_number: invoiceNumber,
    status: financialState.status,
    status_base: financialState.status_base,
    issue_date: issueDate,
    due_date: dueDate,
    currency: String(payload.currency || baseInvoice?.currency || options.currency || 'COP'),
    subtotal: totals.subtotal,
    discount_total: totals.discount_total,
    tax_total: totals.tax_total,
    total: totals.total,
    amount_paid: financialState.amount_paid,
    gross_collected_amount: roundCurrency(payments.filter((payment) => String(payment.event_type || 'payment').toLowerCase() === 'payment').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
    refunded_amount: roundCurrency(payments.filter((payment) => String(payment.event_type || 'payment').toLowerCase() === 'refund').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
    reversed_amount: roundCurrency(payments.filter((payment) => String(payment.event_type || 'payment').toLowerCase() === 'reversal').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
    net_collected_amount: financialState.amount_paid,
    outstanding_balance: financialState.outstanding_balance,
    is_overdue: financialState.is_overdue,
    days_until_due: financialState.days_until_due,
    notes: Object.prototype.hasOwnProperty.call(payload, 'notes') ? (payload.notes || null) : (baseInvoice?.notes || null),
    payment_method: Object.prototype.hasOwnProperty.call(payload, 'payment_method')
      ? (payload.payment_method || null)
      : (baseInvoice?.payment_method || null),
    created_by: baseInvoice?.created_by,
    created_by_name: baseInvoice?.created_by_name || options.currentUserName || null,
    sent_at: financialState.status_base === 'sent'
      ? (baseInvoice?.sent_at || now.toISOString())
      : null,
    paid_at: financialState.status === 'paid' ? now.toISOString() : baseInvoice?.paid_at || null,
    cancelled_at: financialState.status_base === 'cancelled'
      ? (baseInvoice?.cancelled_at || now.toISOString())
      : null,
    created_at: baseInvoice?.created_at || options.createdAt || now.toISOString(),
    updated_at: now.toISOString(),
    sync_status: 'pending',
    is_offline_record: baseInvoice?.is_offline_record ?? options.invoiceId < 0,
    offline_deleted: false,
    client_operation_id: options.clientOperationId,
    items,
    payments,
  };
};

export const applyOfflineInvoiceStatus = (
  invoice: Invoice,
  nextStatus: 'draft' | 'sent' | 'cancelled',
  now = new Date()
) => {
  const netPaidAmount = roundCurrency((invoice.payments || []).reduce((sum, payment) => sum + getInvoicePaymentSignedAmount(payment), 0));
  if (invoice.status_base === 'cancelled' && nextStatus !== 'cancelled') {
    throw new Error('La factura cancelada no puede reabrirse. Duplica la factura si necesitas emitirla de nuevo.');
  }
  if ((invoice.amount_paid || 0) > 0.01 && nextStatus !== 'cancelled') {
    throw new Error('Usa los pagos para actualizar el estado financiero de la factura');
  }
  if (nextStatus === 'cancelled' && netPaidAmount > 0.01) {
    throw new Error('No puedes cancelar una factura mientras tenga cobros netos registrados');
  }

  const nextInvoice: Invoice = {
    ...invoice,
    status_base: nextStatus,
    sync_status: 'pending',
    updated_at: now.toISOString(),
    sent_at: nextStatus === 'sent' ? (invoice.sent_at || now.toISOString()) : invoice.sent_at || null,
    cancelled_at: nextStatus === 'cancelled' ? (invoice.cancelled_at || now.toISOString()) : null,
  };

  const nextState = deriveInvoiceFinancialState(
    nextStatus,
    Number(nextInvoice.total || 0),
    Number(nextInvoice.amount_paid || 0),
    nextInvoice.due_date,
    now
  );

  return {
    ...nextInvoice,
    status: nextState.status,
    is_overdue: nextState.is_overdue,
    days_until_due: nextState.days_until_due,
    outstanding_balance: nextState.outstanding_balance,
  };
};

export const buildOfflineInvoicePaymentRecord = (
  invoice: Invoice,
  payload: Record<string, any>,
  options: BuildInvoicePaymentOptions
): InvoicePayment => {
  const now = options.now || new Date();
  const amount = Number(payload.amount ?? invoice.outstanding_balance ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a cero');
  }
  if (amount > Number(invoice.outstanding_balance || 0) + 0.01) {
    throw new Error('El pago no puede superar el saldo pendiente');
  }
  if (invoice.status_base === 'draft' || invoice.status === 'draft') {
    throw new Error('Marca la factura como enviada antes de registrar pagos.');
  }
  if (invoice.status_base === 'cancelled' || invoice.status === 'cancelled') {
    throw new Error('Las facturas canceladas no aceptan pagos.');
  }
  if ((invoice.outstanding_balance || 0) <= 0.01 || invoice.status === 'paid') {
    throw new Error('La factura ya esta completamente pagada.');
  }

  const paymentDate = toIsoDate(payload.payment_date);
  const paymentDateValue = parseIsoDate(paymentDate);
  const issueDateValue = parseIsoDate(invoice.issue_date);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (!paymentDateValue) {
    throw new Error('La fecha del pago es invalida');
  }
  if (issueDateValue && paymentDateValue.getTime() < issueDateValue.getTime()) {
    throw new Error('La fecha del pago no puede ser anterior a la emision de la factura');
  }
  if (paymentDateValue.getTime() > today.getTime()) {
    throw new Error('La fecha del pago no puede estar en el futuro');
  }

  const paymentMethod = String(payload.payment_method || invoice.payment_method || 'transfer').trim() || 'transfer';
  const note = String(payload.note || '').trim() || null;
  const duplicate = (invoice.payments || []).some((payment) =>
    String(payment.event_type || 'payment').toLowerCase() === 'payment'
    && 
    roundCurrency(Number(payment.amount || 0)) === roundCurrency(amount)
    && payment.payment_date === paymentDate
    && String(payment.payment_method || '') === paymentMethod
    && String(payment.note || '') === String(note || '')
  );
  if (duplicate) {
    throw new Error('Ya registraste un pago identico para esta factura');
  }

  return {
    id: options.paymentId,
    invoice_id: invoice.id,
    amount: roundCurrency(amount),
    signed_amount: roundCurrency(amount),
    payment_date: paymentDate,
    payment_method: paymentMethod,
    treasury_account_id: payload.treasury_account_id == null || payload.treasury_account_id === '' ? null : Number(payload.treasury_account_id),
    event_type: 'payment',
    source_payment_id: null,
    note,
    created_by_name: options.currentUserName || null,
    created_at: now.toISOString(),
    sync_status: 'pending',
    is_offline_record: true,
    client_operation_id: options.clientOperationId,
  };
};

export const applyOfflineInvoicePayment = (
  invoice: Invoice,
  payment: InvoicePayment,
  now = new Date()
) => {
  const payments = [payment, ...(invoice.payments || [])];
  const amountPaid = roundCurrency(payments.reduce((sum, entry) => sum + getInvoicePaymentSignedAmount(entry), 0));
  const nextState = deriveInvoiceFinancialState(
    invoice.status_base === 'draft' || invoice.status_base === 'sent' || invoice.status_base === 'cancelled'
      ? invoice.status_base
      : invoice.status,
    Number(invoice.total || 0),
    amountPaid,
    invoice.due_date,
    now
  );

  return {
    ...invoice,
    payments,
    amount_paid: nextState.amount_paid,
    gross_collected_amount: roundCurrency(payments.filter((entry) => String(entry.event_type || 'payment').toLowerCase() === 'payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)),
    refunded_amount: roundCurrency(payments.filter((entry) => String(entry.event_type || 'payment').toLowerCase() === 'refund').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)),
    reversed_amount: roundCurrency(payments.filter((entry) => String(entry.event_type || 'payment').toLowerCase() === 'reversal').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)),
    net_collected_amount: nextState.amount_paid,
    outstanding_balance: nextState.outstanding_balance,
    status: nextState.status,
    is_overdue: nextState.is_overdue,
    days_until_due: nextState.days_until_due,
    paid_at: nextState.status === 'paid' ? (invoice.paid_at || now.toISOString()) : null,
    sync_status: 'pending' as const,
    updated_at: now.toISOString(),
    payment_method: payment.payment_method || invoice.payment_method,
  };
};

export const serializeInvoiceReceivable = (invoice: Invoice, today = new Date()): InvoiceReceivable => {
  const currentDate = new Date(today);
  currentDate.setHours(0, 0, 0, 0);
  const dueDate = parseIsoDate(invoice.due_date);
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - currentDate.getTime()) / 86400000) : null;
  const daysOverdue = invoice.status === 'overdue' && dueDate
    ? Math.max(Math.abs(daysUntilDue || 0), 0)
    : 0;

  return {
    invoice_id: invoice.id,
    business_id: invoice.business_id,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name || 'Cliente ocasional',
    customer_phone: invoice.customer_phone || null,
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date || null,
    currency: invoice.currency,
    total: roundCurrency(invoice.total || 0),
    paid_amount: roundCurrency(invoice.amount_paid || 0),
    balance_due: roundCurrency(invoice.outstanding_balance || 0),
    status: invoice.status,
    status_base: invoice.status_base,
    is_overdue: Boolean(invoice.status === 'overdue'),
    days_overdue: daysOverdue,
    days_until_due: daysUntilDue,
    payment_method: invoice.payment_method || null,
    notes: invoice.notes || null,
    can_collect: invoice.status_base !== 'draft' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && Number(invoice.outstanding_balance || 0) > 0.01,
    sync_status: invoice.sync_status,
    is_offline_record: invoice.is_offline_record,
  };
};

const matchesReceivableFilter = (
  receivable: InvoiceReceivable,
  filters?: { status?: string; search?: string; customerId?: number | null; startDate?: string; endDate?: string }
) => {
  if (filters?.customerId != null && receivable.customer_id !== filters.customerId) {
    return false;
  }
  if (filters?.startDate && receivable.issue_date && receivable.issue_date < filters.startDate) {
    return false;
  }
  if (filters?.endDate && receivable.issue_date && receivable.issue_date > filters.endDate) {
    return false;
  }
  if (filters?.search) {
    const needle = filters.search.trim().toLowerCase();
    const haystack = [
      receivable.invoice_number,
      receivable.customer_name || '',
      receivable.notes || '',
      receivable.payment_method || '',
    ].join(' ').toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  const statusFilter = String(filters?.status || 'all').trim().toLowerCase();
  if (statusFilter === 'all') {
    return receivable.status_base !== 'draft';
  }
  if (statusFilter === 'unpaid') {
    return receivable.status_base !== 'draft'
      && receivable.paid_amount <= 0.01
      && receivable.balance_due > 0.01
      && receivable.status === 'sent';
  }
  if (statusFilter === 'partial') return receivable.status === 'partial';
  if (statusFilter === 'overdue') return receivable.status === 'overdue';
  if (statusFilter === 'paid') return receivable.status === 'paid';
  if (statusFilter === 'cancelled') return receivable.status === 'cancelled';
  return false;
};

export const buildInvoiceReceivablesOverview = (
  invoices: Invoice[],
  filters?: { status?: string; search?: string; customerId?: number | null; startDate?: string; endDate?: string },
  today = new Date()
): InvoiceReceivablesOverview => {
  const receivables = invoices
    .map((invoice) => serializeInvoiceReceivable(invoice, today))
    .filter((receivable) => matchesReceivableFilter(receivable, filters))
    .sort((a, b) => {
      const order = (value: InvoiceReceivable['status']) =>
        value === 'overdue' ? 0 : value === 'partial' ? 1 : value === 'sent' ? 2 : value === 'paid' ? 3 : 4;
      return order(a.status) - order(b.status)
        || String(a.due_date || '').localeCompare(String(b.due_date || ''))
        || String(a.invoice_number || '').localeCompare(String(b.invoice_number || ''));
    });

  const customerMap = new Map<number, InvoiceReceivablesCustomerSummary>();
  const collectionDays: number[] = [];

  const summary = receivables.reduce((acc, receivable) => {
    if (receivable.status !== 'cancelled' && receivable.balance_due > 0.01) {
      acc.total_outstanding = roundCurrency(acc.total_outstanding + receivable.balance_due);
      acc.unpaid_invoice_count += 1;
      if (receivable.days_until_due === 0) {
        acc.due_today_total = roundCurrency(acc.due_today_total + receivable.balance_due);
      } else if ((receivable.days_until_due || 0) > 0 && (receivable.days_until_due || 0) <= 5) {
        acc.due_soon_total = roundCurrency(acc.due_soon_total + receivable.balance_due);
      } else if ((receivable.days_overdue || 0) <= 0) {
        acc.current_total = roundCurrency(acc.current_total + receivable.balance_due);
      }
    }
    if (receivable.status === 'overdue') {
      acc.overdue_total = roundCurrency(acc.overdue_total + receivable.balance_due);
      acc.overdue_invoice_count += 1;
    }
    if (receivable.status === 'partial') {
      acc.partial_invoice_count += 1;
    }
    if (receivable.status_base !== 'cancelled' && receivable.status_base !== 'draft') {
      acc.invoiced_total = roundCurrency(acc.invoiced_total + receivable.total);
    }
    acc.amount_collected_in_range = roundCurrency(acc.amount_collected_in_range + receivable.paid_amount);
    acc.total_invoice_count += 1;

    if (receivable.customer_id && receivable.status !== 'cancelled' && receivable.balance_due > 0.01) {
      const current = customerMap.get(receivable.customer_id) || {
        customer_id: receivable.customer_id,
        customer_name: receivable.customer_name || 'Cliente ocasional',
        customer_phone: receivable.customer_phone,
        total_balance: 0,
        overdue_balance: 0,
        due_soon_balance: 0,
        due_today_balance: 0,
        current_balance: 0,
        invoice_count: 0,
        nearest_due_date: null,
        max_days_overdue: 0,
        status: 'current' as const,
        status_label: 'Al día',
      };
      current.total_balance = roundCurrency(current.total_balance + receivable.balance_due);
      current.invoice_count += 1;
      current.max_days_overdue = Math.max(current.max_days_overdue, receivable.days_overdue || 0);
      if (receivable.due_date && (!current.nearest_due_date || receivable.due_date < current.nearest_due_date)) {
        current.nearest_due_date = receivable.due_date;
      }
      if (receivable.status === 'overdue' || (receivable.days_overdue || 0) > 0) {
        current.overdue_balance = roundCurrency(current.overdue_balance + receivable.balance_due);
      } else if (receivable.days_until_due === 0) {
        current.due_today_balance = roundCurrency(current.due_today_balance + receivable.balance_due);
      } else if ((receivable.days_until_due || 0) > 0 && (receivable.days_until_due || 0) <= 5) {
        current.due_soon_balance = roundCurrency(current.due_soon_balance + receivable.balance_due);
      } else {
        current.current_balance = roundCurrency(current.current_balance + receivable.balance_due);
      }
      customerMap.set(receivable.customer_id, current);
    }

    if (receivable.status === 'paid' && receivable.issue_date && invoices.find((invoice) => invoice.id === receivable.invoice_id)?.paid_at) {
      const paidAt = new Date(invoices.find((invoice) => invoice.id === receivable.invoice_id)?.paid_at as string);
      const issueDate = new Date(receivable.issue_date);
      if (!Number.isNaN(paidAt.getTime()) && !Number.isNaN(issueDate.getTime()) && paidAt >= issueDate) {
        collectionDays.push(Math.round((paidAt.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    return acc;
  }, {
    total_outstanding: 0,
    overdue_total: 0,
    due_today_total: 0,
    due_soon_total: 0,
    current_total: 0,
    invoiced_total: 0,
    amount_collected_in_range: 0,
    collection_rate: 0,
    average_days_to_collect: null as number | null,
    customer_count: 0,
    unpaid_invoice_count: 0,
    overdue_invoice_count: 0,
    partial_invoice_count: 0,
    total_invoice_count: 0,
  });

  summary.customer_count = customerMap.size;
  summary.collection_rate = summary.invoiced_total > 0
    ? roundCurrency((summary.amount_collected_in_range / summary.invoiced_total) * 100)
    : 0;
  summary.average_days_to_collect = collectionDays.length > 0
    ? roundCurrency(collectionDays.reduce((sum, value) => sum + value, 0) / collectionDays.length)
    : null;

  const customers = Array.from(customerMap.values())
    .map((customer) => {
      const status: ReceivableStatus = customer.overdue_balance > 0
        ? 'overdue'
        : customer.due_today_balance > 0
          ? 'due_today'
          : customer.due_soon_balance > 0
            ? 'due_soon'
            : 'current';
      const statusLabel = status === 'overdue'
        ? 'Vencida'
        : status === 'due_today'
          ? 'Vence hoy'
          : status === 'due_soon'
            ? 'Por vencer'
            : 'Al día';
      return {
        ...customer,
        status,
        status_label: statusLabel,
      };
    })
    .sort((a, b) => b.total_balance - a.total_balance || a.customer_name.localeCompare(b.customer_name));

  return { summary, customers, receivables };
};

export const buildInvoiceCustomerStatement = (
  invoices: Invoice[],
  customer: Customer,
  filters?: { startDate?: string; endDate?: string },
  today = new Date()
): InvoiceCustomerStatement => {
  const filteredInvoices = invoices
    .filter((invoice) => invoice.customer_id === customer.id)
    .filter((invoice) => !filters?.startDate || (invoice.issue_date || '') >= filters.startDate)
    .filter((invoice) => !filters?.endDate || (invoice.issue_date || '') <= filters.endDate)
    .sort((a, b) => String(b.issue_date || '').localeCompare(String(a.issue_date || '')) || b.id - a.id);

  const invoiceRows = filteredInvoices.map((invoice) => serializeInvoiceReceivable(invoice, today));
  const payments = filteredInvoices
    .flatMap((invoice) => (invoice.payments || []).map((payment) => ({
      ...payment,
      invoice_number: invoice.invoice_number,
      invoice_id: invoice.id,
    })))
    .filter((payment) => !filters?.startDate || (payment.payment_date || '') >= filters.startDate)
    .filter((payment) => !filters?.endDate || (payment.payment_date || '') <= filters.endDate)
    .sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')) || Number(b.id || 0) - Number(a.id || 0));

  const summary = invoiceRows.reduce((acc, invoice) => {
    if (invoice.status_base === 'draft') {
      return acc;
    }
    acc.invoice_count += 1;
    if (invoice.status === 'cancelled') {
      acc.cancelled_count += 1;
      return acc;
    }
    acc.total_invoiced = roundCurrency(acc.total_invoiced + invoice.total);
    acc.total_paid = roundCurrency(acc.total_paid + invoice.paid_amount);
    acc.balance_due = roundCurrency(acc.balance_due + invoice.balance_due);
    if (invoice.balance_due > 0.01 && invoice.status !== 'paid') {
      acc.open_count += 1;
    }
    if (invoice.status === 'overdue') {
      acc.overdue_count += 1;
      acc.overdue_total = roundCurrency(acc.overdue_total + invoice.balance_due);
    }
    return acc;
  }, {
    invoice_count: 0,
    open_count: 0,
    overdue_count: 0,
    cancelled_count: 0,
    total_invoiced: 0,
    total_paid: 0,
    payments_received: 0,
    payment_count: payments.length,
    balance_due: 0,
    overdue_total: 0,
  });

  summary.payments_received = roundCurrency(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));

  return {
    business_id: customer.business_id,
    customer,
    summary,
    invoices: invoiceRows,
    payments,
    date_range: {
      start_date: filters?.startDate || null,
      end_date: filters?.endDate || null,
    },
  };
};

export const buildPendingInvoiceNumberLabel = (invoiceId: number, prefix = 'INV') =>
  `${prefix}-PEND-${String(Math.abs(invoiceId)).slice(-6)}`;

export const buildOfflineInvoiceItemSummary = (items: InvoiceItem[], limit = 3) => {
  const visibleItems = items.slice(0, limit);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);
  const lines = visibleItems.map((item) => `- ${item.description} x${formatQuantity(Number(item.quantity || 0))}`);
  if (hiddenCount > 0) {
    lines.push(`- +${hiddenCount} linea(s) adicional(es)`);
  }
  return lines;
};
const getInvoicePaymentSignedAmount = (payment: Pick<InvoicePayment, 'amount' | 'event_type' | 'signed_amount'>) => {
  if (typeof payment.signed_amount === 'number' && Number.isFinite(payment.signed_amount)) {
    return roundCurrency(payment.signed_amount);
  }
  return String(payment.event_type || 'payment').toLowerCase() === 'payment'
    ? roundCurrency(Number(payment.amount || 0))
    : roundCurrency(-Number(payment.amount || 0));
};
