import {
  isBusinessModuleEnabled,
  type Business,
  type BusinessModuleKey,
  type Customer,
  type Invoice,
  type InvoiceCustomerStatement,
  type InvoicePayment,
  type InvoiceReceivablesOverview,
  type Payment,
  type PaymentAllocation,
  type Product,
  type ReceivableItem,
  type ReceivablesCustomerSummary,
  type ReceivablesOverview,
  type Sale,
  type TreasuryAccount,
} from '../types';
import { isOfflineSyncEnabled } from '../config/offline';
import {
  offlineDb,
  PendingSyncOperation,
  SyncErrorCategory,
  SyncOperationConflict,
  SyncOperationHistoryEntry,
  SyncOperationStatus,
} from './offlineDb';
import {
  applyOfflineInvoicePayment,
  applyOfflineInvoiceStatus,
  buildInvoiceCustomerStatement,
  buildInvoiceReceivablesOverview,
  buildOfflineInvoicePaymentRecord,
  buildOfflineInvoiceRecord,
  buildPendingInvoiceNumberLabel,
} from './invoiceOfflineState';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';

export const OFFLINE_SYNC_EVENT = 'encaja-offline-changed';
export const OFFLINE_SNAPSHOT_APPLIED_EVENT = 'encaja-offline-snapshot-applied';

const LAST_SYNC_KEY_PREFIX = 'offline:last-sync:';
const TEMP_ID_MAP_KEY_PREFIX = 'offline:id-map:';
const DUE_SOON_DAYS_FALLBACK = 5;

type SyncEntityType = 'sale' | 'payment' | 'customer' | 'product' | 'invoice';
type QueueableStoreName = 'customers' | 'products' | 'sales' | 'payments' | 'invoices';
type OfflineEntityRecord = {
  id: number;
  sync_status?: 'synced' | 'pending' | 'failed' | 'blocked' | 'conflicted';
  is_offline_record?: boolean;
  offline_deleted?: boolean;
  client_operation_id?: string;
};

type InvoiceLocalSyncStatus = NonNullable<Invoice['sync_status']>;

type AuthorizedJsonOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
};

type SyncOperationSummary = {
  pending: number;
  syncing: number;
  failed: number;
  blocked: number;
  conflicted: number;
  synced: number;
};

type NormalizedSyncError = {
  status: SyncOperationStatus;
  category: SyncErrorCategory;
  message: string;
  technicalDetail?: string | null;
  conflict?: SyncOperationConflict | null;
  blockedByOperationId?: string | null;
  blockedByEntityId?: number | null;
};

const normalizeProductFulfillmentMode = (value: any, productType?: any) => {
  const normalizedType = productType === 'service' ? 'service' : 'product';
  if (normalizedType === 'service') {
    return 'service';
  }

  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'make_to_stock' || normalizedValue === 'make_to_order' || normalizedValue === 'resale_stock') {
    return normalizedValue;
  }

  return undefined;
};

const buildOfflineCustomerRecord = (businessId: number, payload: Record<string, any>, tempId: number, clientOperationId: string): Customer => {
  const user = getStoredUser();
  const sanitized = sanitizeCustomerPayload(payload);

  return {
    id: tempId,
    business_id: businessId,
    name: String(sanitized.name || '').trim(),
    phone: sanitized.phone || undefined,
    address: sanitized.address || undefined,
    notes: sanitized.notes || undefined,
    balance: 0,
    active: sanitized.active ?? true,
    created_at: new Date().toISOString(),
    created_by_name: user?.name,
    sync_status: 'pending',
    is_offline_record: true,
    client_operation_id: clientOperationId,
  };
};

const buildOfflineProductRecord = (businessId: number, payload: Record<string, any>, tempId: number, clientOperationId: string): Product => {
  const sanitized = sanitizeProductPayload(payload);

  return {
    id: tempId,
    business_id: businessId,
    name: String(sanitized.name || '').trim(),
    description: sanitized.description || undefined,
    type: sanitized.type || 'product',
    sku: sanitized.sku || undefined,
    price: Number(sanitized.price || 0),
    cost: sanitized.cost == null ? undefined : Number(sanitized.cost),
    unit: String(sanitized.unit || 'und'),
    stock: Number(sanitized.stock || 0),
    low_stock_threshold: Number(sanitized.low_stock_threshold || 0),
    fulfillment_mode: sanitized.fulfillment_mode || (sanitized.type === 'service' ? 'service' : undefined),
    active: sanitized.active ?? true,
    image: sanitized.image || undefined,
    barcodes: sanitized.barcodes || [],
    created_at: new Date().toISOString(),
    sync_status: 'pending',
    is_offline_record: true,
    client_operation_id: clientOperationId,
  };
};

const emitOfflineSyncEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OFFLINE_SYNC_EVENT));
  }
};

const emitOfflineSnapshotApplied = (businessIds: number[]) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_SNAPSHOT_APPLIED_EVENT, { detail: { businessIds } }));
  }
};

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;

  try {
    return JSON.parse(window.localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getCurrentUserId = () => Number(getStoredUser()?.id || 0);

const hasBusinessPermission = (business: Business | null | undefined, permission?: string) => {
  if (!permission) return true;

  const user = getStoredUser();
  const permissions = business?.permissions || [];
  const isOwner = !!user?.id && business?.user_id === user.id;
  const isAdmin = !!(user?.is_admin || user?.permissions?.admin);

  if (isOwner || isAdmin) return true;
  if (permissions.includes('*') || permissions.includes('admin.*') || permissions.includes(permission)) return true;

  const [scope] = permission.split('.');
  return permissions.includes(`${scope}.*`);
};

const canSnapshotResource = (
  business: Business | null | undefined,
  options: { moduleKey?: BusinessModuleKey; permission?: string }
) => {
  if (!business) return false;
  if (options.moduleKey && !isBusinessModuleEnabled(business.modules, options.moduleKey)) {
    return false;
  }
  return hasBusinessPermission(business, options.permission);
};

const getBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  if (typeof window === 'undefined') {
    return envBaseUrl;
  }

  const storedBaseUrl = window.localStorage.getItem('API_BASE_URL')?.trim();
  const isFileProtocol = window.location.protocol === 'file:';
  const isEnvRelative = envBaseUrl.startsWith('/');

  if (storedBaseUrl && (isFileProtocol || !isEnvRelative)) {
    return storedBaseUrl;
  }

  return envBaseUrl;
};

const buildUrl = (path: string) => {
  const baseUrl = getBaseUrl();

  if (baseUrl.startsWith('http')) {
    return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }

  if (typeof window === 'undefined') {
    return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }

  const normalizedBase = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return `${window.location.origin}${normalizedBase.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

const authorizedJsonRequest = async <T>(path: string, options: AuthorizedJsonOptions = {}): Promise<T> => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

  if (!token) {
    throw new Error('Sesión no disponible para sincronizar');
  }

  const response = await fetch(buildUrl(path), {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload?.error || `HTTP ${response.status}`) as Error & { status?: number; payload?: Record<string, any> };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return response.json() as Promise<T>;
};

const createTempId = () => -Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);

const createClientOperationId = (entityType: SyncEntityType) =>
  `${entityType}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getStoreNameForEntity = (entityType: SyncEntityType): QueueableStoreName => {
  if (entityType === 'customer') return 'customers';
  if (entityType === 'product') return 'products';
  if (entityType === 'sale') return 'sales';
  if (entityType === 'invoice') return 'invoices';
  return 'payments';
};

const getResponseEntityKey = (entityType: SyncEntityType) => {
  if (entityType === 'customer') return 'customer';
  if (entityType === 'product') return 'product';
  if (entityType === 'sale') return 'sale';
  if (entityType === 'invoice') return 'invoice';
  return 'payment';
};

const buildSyncHistoryEntry = (
  status: SyncOperationStatus,
  message: string,
  category?: SyncErrorCategory | null
): SyncOperationHistoryEntry => ({
  at: new Date().toISOString(),
  status,
  message,
  category: category || null,
});

const buildSyncError = (
  message: string,
  options: Partial<NormalizedSyncError> = {}
) => Object.assign(new Error(message), {
  status: options.status || 'failed',
  category: options.category || 'unexpected_server_error',
  technicalDetail: options.technicalDetail || null,
  conflict: options.conflict || null,
  blockedByOperationId: options.blockedByOperationId || null,
  blockedByEntityId: options.blockedByEntityId || null,
});

const getTempIdMapKey = (entityType: SyncEntityType, businessId: number, tempId: number) =>
  `${TEMP_ID_MAP_KEY_PREFIX}${entityType}:${businessId}:${tempId}`;

const isPendingRecord = (record: OfflineEntityRecord) =>
  record.is_offline_record
  || record.sync_status === 'pending'
  || record.sync_status === 'failed'
  || record.sync_status === 'blocked'
  || record.sync_status === 'conflicted';

const isOfflineDeletedRecord = (record: OfflineEntityRecord) => record.offline_deleted === true;

const filterVisibleRecords = <T extends OfflineEntityRecord>(records: T[]) =>
  records.filter((record) => !isOfflineDeletedRecord(record));

const sanitizeCustomerPayload = (payload: Record<string, any>) => {
  const sanitized: Record<string, any> = {};

  if ('name' in payload) sanitized.name = String(payload.name || '').trim();
  if ('phone' in payload) sanitized.phone = String(payload.phone || '').trim() || null;
  if ('address' in payload) sanitized.address = String(payload.address || '').trim() || null;
  if ('notes' in payload) sanitized.notes = String(payload.notes || '').trim() || null;
  if ('active' in payload) sanitized.active = Boolean(payload.active);

  return sanitized;
};

const sanitizeProductPayload = (payload: Record<string, any>) => {
  const sanitized: Record<string, any> = {};

  if ('name' in payload) sanitized.name = String(payload.name || '').trim();
  if ('description' in payload) sanitized.description = String(payload.description || '').trim() || null;
  if ('type' in payload) sanitized.type = payload.type === 'service' ? 'service' : 'product';
  if ('fulfillment_mode' in payload || 'type' in payload) {
    const normalizedFulfillmentMode = normalizeProductFulfillmentMode(
      payload.fulfillment_mode,
      'type' in payload ? payload.type : undefined,
    );
    if (normalizedFulfillmentMode !== undefined) {
      sanitized.fulfillment_mode = normalizedFulfillmentMode;
    }
  }
  if ('sku' in payload) sanitized.sku = String(payload.sku || '').trim() || null;
  if ('price' in payload) sanitized.price = Number(payload.price || 0);
  if ('cost' in payload) sanitized.cost = payload.cost == null || payload.cost === '' ? undefined : Number(payload.cost);
  if ('unit' in payload) sanitized.unit = String(payload.unit || '').trim() || 'und';
  if ('stock' in payload) sanitized.stock = Number(payload.stock || 0);
  if ('low_stock_threshold' in payload) sanitized.low_stock_threshold = Number(payload.low_stock_threshold || 0);
  if ('active' in payload) sanitized.active = Boolean(payload.active);
  if ('image' in payload) sanitized.image = payload.image || '';
  if ('barcodes' in payload && Array.isArray(payload.barcodes)) {
    sanitized.barcodes = payload.barcodes.map((code: any) => String(code || '').trim()).filter(Boolean);
  }

  return sanitized;
};

const sortSalesByDateAsc = (sales: Sale[]) =>
  [...sales].sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());

const toBusinessScope = () => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('No hay usuario autenticado para almacenamiento offline');
  }
  return userId;
};

const getBusinessTermConfig = (business: Business | null) => {
  const settings = business?.settings || {};
  const defaultTermDays = typeof settings.debt_term_days === 'number'
    ? settings.debt_term_days
    : 30;
  const dueSoonDays = typeof settings.due_soon_days === 'number'
    ? settings.due_soon_days
    : DUE_SOON_DAYS_FALLBACK;
  const overrides = settings.receivable_terms_by_sale && typeof settings.receivable_terms_by_sale === 'object'
    ? settings.receivable_terms_by_sale
    : {};

  return { defaultTermDays, dueSoonDays, overrides };
};

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const computeReceivableStatus = (dueDate: string, dueSoonDays: number) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      status: 'overdue' as const,
      statusLabel: 'Vencido',
      daysUntilDue: diffDays,
      daysOverdue: Math.abs(diffDays),
    };
  }

  if (diffDays === 0) {
    return {
      status: 'due_today' as const,
      statusLabel: 'Vence hoy',
      daysUntilDue: 0,
      daysOverdue: 0,
    };
  }

  if (diffDays <= dueSoonDays) {
    return {
      status: 'due_soon' as const,
      statusLabel: 'Por vencer',
      daysUntilDue: diffDays,
      daysOverdue: 0,
    };
  }

  return {
    status: 'current' as const,
    statusLabel: 'Al día',
    daysUntilDue: diffDays,
    daysOverdue: 0,
  };
};

const normalizeSale = (sale: Sale): Sale => ({
  ...sale,
  collected_amount: Number(sale.collected_amount || 0),
  balance: Number(sale.balance || 0),
  subtotal: Number(sale.subtotal || 0),
  discount: Number(sale.discount || 0),
  total: Number(sale.total || 0),
  total_cost: Number(sale.total_cost || 0),
});

const normalizePayment = (payment: Payment): Payment => ({
  ...payment,
  amount: Number(payment.amount || 0),
  allocations: Array.isArray(payment.allocations)
    ? payment.allocations
        .map((allocation) => ({
          sale_id: Number(allocation.sale_id),
          amount: Number(allocation.amount || 0),
        }))
        .filter((allocation) => Number.isFinite(allocation.sale_id) && allocation.amount > 0)
    : [],
});

const normalizeInvoicePayment = (payment: InvoicePayment): InvoicePayment => ({
  ...payment,
  amount: Number(payment.amount || 0),
  signed_amount: Number(
    payment.signed_amount
      ?? (String(payment.event_type || 'payment').toLowerCase() === 'payment'
        ? Number(payment.amount || 0)
        : -Number(payment.amount || 0))
  ),
  treasury_account_id: payment.treasury_account_id == null ? null : Number(payment.treasury_account_id),
  source_payment_id: payment.source_payment_id == null ? null : Number(payment.source_payment_id),
});

const normalizeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  subtotal: Number(invoice.subtotal || 0),
  discount_total: Number(invoice.discount_total || 0),
  tax_total: Number(invoice.tax_total || 0),
  total: Number(invoice.total || 0),
  amount_paid: Number(invoice.amount_paid || 0),
  outstanding_balance: Number(invoice.outstanding_balance || 0),
  items: Array.isArray(invoice.items)
    ? invoice.items.map((item, index) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        discount: Number(item.discount || 0),
        tax_rate: Number(item.tax_rate || 0),
        line_total: Number(item.line_total || 0),
        sort_order: item.sort_order ?? index,
      }))
    : [],
  payments: Array.isArray(invoice.payments) ? invoice.payments.map(normalizeInvoicePayment) : [],
});

const deriveInvoiceRecordSyncStatus = (
  invoice: Pick<Invoice, 'payments'>,
  pendingOperations: PendingSyncOperation[] = [],
  fallback?: InvoiceLocalSyncStatus
) => {
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const hasConflictedPayment = payments.some((payment) => payment.sync_status === 'conflicted');
  const hasBlockedPayment = payments.some((payment) => payment.sync_status === 'blocked');
  const hasFailedPayment = payments.some((payment) => payment.sync_status === 'failed');
  const hasPendingPayment = payments.some((payment) => payment.sync_status === 'pending' || payment.is_offline_record);
  const hasConflictedOperation = pendingOperations.some((operation) => operation.status === 'conflicted');
  const hasBlockedOperation = pendingOperations.some((operation) => operation.status === 'blocked');
  const hasFailedOperation = pendingOperations.some((operation) => operation.status === 'failed');
  const hasPendingOperation = pendingOperations.some((operation) => operation.status === 'pending' || operation.status === 'syncing');

  if (hasConflictedPayment || hasConflictedOperation) return 'conflicted' as const;
  if (hasBlockedPayment || hasBlockedOperation) return 'blocked' as const;
  if (hasFailedPayment || hasFailedOperation) return 'failed' as const;
  if (hasPendingPayment || hasPendingOperation) return 'pending' as const;
  return fallback || 'synced';
};

const withInvoiceRecordSyncStatus = (
  invoice: Invoice,
  pendingOperations: PendingSyncOperation[] = [],
  fallback?: InvoiceLocalSyncStatus
) => {
  const syncStatus = deriveInvoiceRecordSyncStatus(invoice, pendingOperations, fallback);
  return normalizeInvoice({
    ...invoice,
    sync_status: syncStatus,
    is_offline_record: syncStatus !== 'synced',
    offline_deleted: false,
  });
};

const hasPendingInvoiceLocalState = (invoice: Invoice) =>
  isPendingRecord(invoice)
  || (invoice.payments || []).some((payment) =>
    payment.sync_status === 'pending'
    || payment.sync_status === 'failed'
    || payment.sync_status === 'blocked'
    || payment.sync_status === 'conflicted'
    || payment.is_offline_record
  );

const mergeLocalInvoicePayments = (
  serverInvoice: Invoice,
  localInvoice: Invoice | null,
  options: { excludeClientOperationId?: string | null; pendingOperations?: PendingSyncOperation[] } = {}
) => {
  const preservedPayments = (localInvoice?.payments || [])
    .filter((payment) =>
      payment.sync_status === 'pending'
      || payment.sync_status === 'failed'
      || payment.sync_status === 'blocked'
      || payment.sync_status === 'conflicted'
    )
    .filter((payment) => !options.excludeClientOperationId || payment.client_operation_id !== options.excludeClientOperationId)
    .map((payment) => normalizeInvoicePayment({
      ...payment,
      sync_status: payment.sync_status || 'pending',
      is_offline_record: payment.is_offline_record ?? true,
    }));

  const nextInvoice = normalizeInvoice({
    ...serverInvoice,
    payments: [...preservedPayments, ...(serverInvoice.payments || []).map(normalizeInvoicePayment)],
  });

  return withInvoiceRecordSyncStatus(nextInvoice, options.pendingOperations || []);
};

const roundCurrency = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const sortPaymentsByDateAsc = (payments: Payment[]) =>
  [...payments].sort((a, b) => {
    const dateDiff = new Date(a.payment_date || a.created_at || 0).getTime() - new Date(b.payment_date || b.created_at || 0).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

const queueOperation = async (operation: PendingSyncOperation) => {
  const nextOperation: PendingSyncOperation = {
    retryCount: 0,
    lastAttemptAt: null,
    completedAt: null,
    errorCategory: null,
    errorDetail: null,
    technicalDetail: null,
    blockedByOperationId: null,
    blockedByEntityId: null,
    conflict: null,
    history: [buildSyncHistoryEntry('pending', 'Operación en cola')],
    ...operation,
  };
  await offlineDb.putSyncOperation(nextOperation);
  emitOfflineSyncEvent();
};

const appendOperationHistory = (
  operation: PendingSyncOperation,
  status: SyncOperationStatus,
  message: string,
  category?: SyncErrorCategory | null
) => [
  ...(operation.history || []),
  buildSyncHistoryEntry(status, message, category),
].slice(-12);

const updateSyncOperationWithHistory = async (
  operationId: string,
  patch: Partial<PendingSyncOperation>,
  event?: { status: SyncOperationStatus; message: string; category?: SyncErrorCategory | null }
) => {
  const current = await offlineDb.getSyncOperation(operationId);
  if (!current) return null;

  const next: PendingSyncOperation = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    history: event
      ? appendOperationHistory(current, event.status, event.message, event.category)
      : current.history,
  };

  await offlineDb.putSyncOperation(next);
  return next;
};

const summarizeSyncOperations = (operations: PendingSyncOperation[]): SyncOperationSummary =>
  operations.reduce<SyncOperationSummary>((acc, operation) => {
    acc[operation.status] += 1;
    return acc;
  }, {
    pending: 0,
    syncing: 0,
    failed: 0,
    blocked: 0,
    conflicted: 0,
    synced: 0,
  });

const mergeWithPendingLocalRecords = <T extends OfflineEntityRecord>(
  remoteRecords: T[],
  localRecords: T[]
) => {
  const pendingDeletedIds = new Set(
    localRecords
      .filter((record) => isPendingRecord(record) && isOfflineDeletedRecord(record))
      .map((record) => record.id)
  );
  const filteredRemoteRecords = remoteRecords.filter((record) => !pendingDeletedIds.has(record.id));
  const remoteIds = new Set(filteredRemoteRecords.map((record) => record.id));
  const pendingLocalRecords = localRecords.filter((record) => {
    if (pendingDeletedIds.has(record.id)) {
      return true;
    }

    if (remoteIds.has(record.id)) {
      return false;
    }

    return isPendingRecord(record);
  });

  return [...filteredRemoteRecords, ...pendingLocalRecords];
};

const storeTempIdMapping = async (entityType: SyncEntityType, businessId: number, tempId: number, realId: number) => {
  await offlineDb.putMetadata(getTempIdMapKey(entityType, businessId, tempId), realId);
};

const getMappedId = async (entityType: SyncEntityType, businessId: number, id: number | null | undefined) => {
  if (id == null) return id;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return id;
  if (numericId > 0) return numericId;

  const mappedId = await offlineDb.getMetadata<number>(getTempIdMapKey(entityType, businessId, numericId));
  return mappedId ?? numericId;
};

const resolveRequiredMappedId = async (entityType: SyncEntityType, businessId: number, id: number | null | undefined, label: string) => {
  if (id == null || id === 0) return id;
  const mappedId = await getMappedId(entityType, businessId, Number(id));
  if (typeof mappedId === 'number' && mappedId < 0) {
    const blockingOperation = (await offlineDb.listSyncOperations(businessId)).find((operation) =>
      operation.entityType === entityType
      && operation.action === 'create'
      && operation.entityId === Number(id)
    );
    throw buildSyncError(`Aún no se pudo sincronizar ${label}`, {
      status: 'blocked',
      category: 'parent_missing',
      technicalDetail: `No existe mapeo local->servidor para ${entityType}:${id}`,
      blockedByOperationId: blockingOperation?.id || null,
      blockedByEntityId: Number(id),
    });
  }
  return mappedId;
};

const resolveOperationPayloadReferences = async (operation: PendingSyncOperation) => {
  if (operation.entityType === 'sale') {
    const nextPayload = { ...operation.payload };
    if (nextPayload.customer_id != null) {
      nextPayload.customer_id = await resolveRequiredMappedId('customer', operation.businessId, Number(nextPayload.customer_id), 'el cliente relacionado');
    }
    if (Array.isArray(nextPayload.items)) {
      nextPayload.items = await Promise.all(nextPayload.items.map(async (item: Record<string, any>) => {
        if (item?.product_id == null) {
          return item;
        }
        return {
          ...item,
          product_id: await resolveRequiredMappedId('product', operation.businessId, Number(item.product_id), 'el producto relacionado'),
        };
      }));
    }
    return nextPayload;
  }

  if (operation.entityType === 'payment') {
    const nextPayload = { ...operation.payload };
    if (nextPayload.customer_id != null) {
      nextPayload.customer_id = await resolveRequiredMappedId('customer', operation.businessId, Number(nextPayload.customer_id), 'el cliente relacionado');
    }
    if (nextPayload.sale_id != null) {
      nextPayload.sale_id = await resolveRequiredMappedId('sale', operation.businessId, Number(nextPayload.sale_id), 'la venta relacionada');
    }
    return nextPayload;
  }

  if (operation.entityType === 'invoice') {
    const nextPayload = { ...operation.payload };
    if (nextPayload.customer_id != null) {
      nextPayload.customer_id = await resolveRequiredMappedId('customer', operation.businessId, Number(nextPayload.customer_id), 'el cliente relacionado');
    }
    if (nextPayload.invoice_id != null) {
      nextPayload.invoice_id = await resolveRequiredMappedId('invoice', operation.businessId, Number(nextPayload.invoice_id), 'la factura relacionada');
    }
    if (Array.isArray(nextPayload.items)) {
      nextPayload.items = await Promise.all(nextPayload.items.map(async (item: Record<string, any>) => {
        if (item?.product_id == null) {
          return item;
        }
        return {
          ...item,
          product_id: await resolveRequiredMappedId('product', operation.businessId, Number(item.product_id), 'el producto relacionado'),
        };
      }));
    }
    return nextPayload;
  }

  return { ...operation.payload };
};

const resolveOperationEntityId = async (operation: PendingSyncOperation) => {
  if (operation.entityType === 'invoice' && operation.entityId != null && Number(operation.entityId) < 0) {
    return resolveRequiredMappedId('invoice', operation.businessId, Number(operation.entityId), 'la factura relacionada');
  }
  return operation.entityId;
};

const resolveOperationEndpoint = async (operation: PendingSyncOperation) => {
  const resolvedEntityId = await resolveOperationEntityId(operation);
  if (resolvedEntityId == null || resolvedEntityId === operation.entityId) {
    return operation.endpoint;
  }

  return String(operation.endpoint || '').replace(`/${operation.entityId}`, `/${resolvedEntityId}`);
};

const listPendingOperationsForEntity = async (businessId: number, entityType: SyncEntityType, entityId: number) => {
  const operations = await offlineDb.listPendingSyncOperations(businessId);
  return operations.filter((operation) => operation.entityType === entityType && operation.entityId === entityId);
};

const ensureNoPendingOperationReferences = async (businessId: number, entityType: 'customer' | 'product', entityId: number) => {
  const operations = await offlineDb.listPendingSyncOperations(businessId);
  const hasReference = operations.some((operation) => {
    if (operation.entityType === 'sale') {
      const payload = operation.payload || {};
      if (entityType === 'customer') {
        return Number(payload.customer_id) === entityId;
      }

      return Array.isArray(payload.items)
        && payload.items.some((item: Record<string, any>) => Number(item?.product_id) === entityId);
    }

    if (operation.entityType === 'payment' && entityType === 'customer') {
      return Number(operation.payload?.customer_id) === entityId;
    }

    return false;
  });

  if (hasReference) {
    throw new Error(
      entityType === 'customer'
        ? 'No puedes eliminar este cliente mientras existan ventas o cobros pendientes que lo usan'
        : 'No puedes eliminar este producto mientras existan ventas pendientes que lo usan'
    );
  }
};

const replacePendingOperation = async (baseOperation: PendingSyncOperation, patch: Partial<PendingSyncOperation>) => {
  const nextOperation: PendingSyncOperation = {
    ...baseOperation,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await offlineDb.putSyncOperation(nextOperation);
  emitOfflineSyncEvent();
  return nextOperation;
};

const removePendingOperations = async (operations: PendingSyncOperation[]) => {
  await Promise.all(operations.map((operation) => offlineDb.deleteSyncOperation(operation.id)));
  emitOfflineSyncEvent();
};

const getLocalInvoiceRecordForOperation = async (operation: PendingSyncOperation) => {
  if (operation.entityType !== 'invoice') return null;
  const lookupId = operation.action === 'create' && operation.tempId != null
    ? operation.tempId
    : Number(await getMappedId('invoice', operation.businessId, Number(operation.entityId)));
  if (!Number.isFinite(lookupId)) return null;
  const record = await offlineDb.getEntity<Invoice>('invoices', operation.businessId, lookupId);
  return record ? normalizeInvoice(record) : null;
};

const listInvoiceOperationsForInvoice = async (businessId: number, invoiceId: number) => {
  const operations = (await offlineDb.listSyncOperations(businessId))
    .filter((operation) => operation.entityType === 'invoice');

  const matches = [];
  for (const operation of operations) {
    const resolvedId = Number(await getMappedId('invoice', businessId, Number(operation.entityId)));
    if (resolvedId === invoiceId || Number(operation.entityId) === invoiceId || Number(operation.tempId) === invoiceId) {
      matches.push(operation);
    }
  }
  return matches;
};

const deleteSyncOperationsByIds = async (operationIds: string[]) => {
  await Promise.all(operationIds.map((operationId) => offlineDb.deleteSyncOperation(operationId)));
  emitOfflineSyncEvent();
};

const restoreInvoiceFromServer = async (businessId: number, invoiceId: number) => {
  if (!isBackendCapabilitySupported('invoices')) {
    throw new Error('Facturas no está disponible en el backend actual');
  }
  const response = await authorizedJsonRequest<{ invoice: Invoice }>(`/businesses/${businessId}/invoices/${invoiceId}`);
  const invoice = normalizeInvoice(response.invoice);
  await offlineDb.upsertEntity('invoices', businessId, invoice.id, withInvoiceRecordSyncStatus(invoice, [], 'synced'));
  return invoice;
};

const updateLocalInvoiceOperationState = async (
  operation: PendingSyncOperation,
  nextStatus: SyncOperationStatus
) => {
  if (operation.entityType !== 'invoice') return;

  const invoice = await getLocalInvoiceRecordForOperation(operation);
  if (!invoice) return;
  const nextLocalStatus: InvoiceLocalSyncStatus = nextStatus === 'syncing' ? 'pending' : nextStatus;

  let nextInvoice: Invoice;
  if (operation.action === 'payment_create') {
    const nextPayments = (invoice.payments || []).map((payment) =>
      payment.client_operation_id === operation.clientOperationId
        ? {
            ...payment,
            sync_status: nextLocalStatus,
            is_offline_record: nextLocalStatus !== 'synced',
          }
        : payment
    );
    nextInvoice = withInvoiceRecordSyncStatus(
      {
        ...invoice,
        payments: nextPayments,
        updated_at: new Date().toISOString(),
      },
      [],
      nextLocalStatus
    );
  } else {
    nextInvoice = withInvoiceRecordSyncStatus({
      ...invoice,
      sync_status: nextLocalStatus,
      is_offline_record: nextLocalStatus !== 'synced',
      updated_at: new Date().toISOString(),
    }, [], nextLocalStatus);
  }

  await offlineDb.upsertEntity('invoices', operation.businessId, Number(nextInvoice.id), nextInvoice);
};

const normalizeSyncError = (operation: PendingSyncOperation, error: any): NormalizedSyncError => {
  if (error?.category) {
    return {
      status: error.status || 'failed',
      category: error.category,
      message: error.message || 'No se pudo sincronizar la operación',
      technicalDetail: error.technicalDetail || null,
      conflict: error.conflict || null,
      blockedByOperationId: error.blockedByOperationId || null,
      blockedByEntityId: error.blockedByEntityId || null,
    };
  }

  const status = typeof error?.status === 'number' ? error.status : undefined;
  const payload = error?.payload || {};
  const message = String(error?.message || payload?.error || 'No se pudo sincronizar la operación');
  const lowerMessage = message.toLowerCase();

  if (!navigator.onLine) {
    return {
      status: 'pending',
      category: 'network_unavailable',
      message: 'No hay conexión para sincronizar esta operación.',
      technicalDetail: message,
    };
  }

  if (status === 409 || payload?.code === 'invoice_conflict') {
    return {
      status: 'conflicted',
      category: 'conflict_detected',
      message: 'La factura cambió en el servidor y tu cambio local necesita revisión.',
      technicalDetail: message,
      conflict: payload?.conflict || null,
    };
  }

  if (status != null && [502, 503, 504].includes(status)) {
    return {
      status: 'pending',
      category: 'server_unavailable',
      message: 'El servidor no estuvo disponible. Reintentaremos cuando vuelva a responder.',
      technicalDetail: message,
    };
  }

  if (status === 400 || status === 422) {
    return {
      status: 'failed',
      category: lowerMessage.includes('no puedes')
        || lowerMessage.includes('usa los pagos')
        || lowerMessage.includes('marca la factura')
        || lowerMessage.includes('facturas canceladas')
        ? 'business_rule_rejected'
        : 'validation_rejected',
      message,
      technicalDetail: message,
    };
  }

  if (status != null && status >= 500) {
    return {
      status: 'pending',
      category: 'server_unavailable',
      message: 'Hubo un error temporal del servidor. Reintentaremos la sincronización.',
      technicalDetail: message,
    };
  }

  if (status == null) {
    return {
      status: 'pending',
      category: 'network_unavailable',
      message: 'La conexión se interrumpió antes de terminar la sincronización.',
      technicalDetail: message,
    };
  }

  return {
    status: 'failed',
    category: 'unexpected_server_error',
    message: operation.entityType === 'invoice'
      ? 'La operación de factura falló por una respuesta inesperada del servidor.'
      : message,
    technicalDetail: message,
  };
};

const updateLastSyncAt = async (businessId: number, value: string | null) => {
  if (!value) return;
  await offlineDb.putMetadata(`${LAST_SYNC_KEY_PREFIX}${businessId}`, value);
  emitOfflineSyncEvent();
};

const getLocalReferenceMaps = async (businessId: number) => {
  const [customers, treasuryAccounts, products] = await Promise.all([
    offlineDb.getEntities<Customer>('customers', businessId),
    offlineDb.getEntities<TreasuryAccount>('treasury_accounts', businessId),
    offlineDb.getEntities<Product>('products', businessId),
  ]);

  return {
    customers: new Map(customers.map((customer) => [customer.id, customer])),
    treasuryAccounts: new Map(treasuryAccounts.map((account) => [account.id, account])),
    products: new Map(products.map((product) => [product.id, product])),
  };
};

const buildLocalPaymentRecord = async (
  businessId: number,
  payload: Record<string, any>,
  options: { basePayment?: Payment | null; paymentId: number; clientOperationId: string; createdAt?: string }
): Promise<Payment> => {
  const { customers, treasuryAccounts } = await getLocalReferenceMaps(businessId);
  const basePayment = options.basePayment || null;
  const customerId = payload.customer_id != null
    ? Number(payload.customer_id)
    : basePayment?.customer_id != null
      ? Number(basePayment.customer_id)
      : undefined;
  const treasuryAccountId = Object.prototype.hasOwnProperty.call(payload, 'treasury_account_id')
    ? (payload.treasury_account_id == null || payload.treasury_account_id === '' ? null : Number(payload.treasury_account_id))
    : basePayment?.treasury_account_id ?? null;
  const treasuryAccount = treasuryAccountId != null ? treasuryAccounts.get(treasuryAccountId) : null;
  const method = String(payload.method || payload.payment_method || basePayment?.method || basePayment?.payment_method || 'cash');

  return normalizePayment({
    ...basePayment,
    id: options.paymentId,
    business_id: businessId,
    customer_id: customerId,
    sale_id: Object.prototype.hasOwnProperty.call(payload, 'sale_id')
      ? (payload.sale_id == null || payload.sale_id === '' ? undefined : Number(payload.sale_id))
      : basePayment?.sale_id,
    amount: Number(payload.amount ?? basePayment?.amount ?? 0),
    payment_date: String(payload.payment_date || basePayment?.payment_date || new Date().toISOString().split('T')[0]),
    method,
    payment_method: method,
    treasury_account_id: treasuryAccountId,
    treasury_account_name: treasuryAccount?.name || null,
    treasury_account_type: treasuryAccount?.account_type || null,
    note: Object.prototype.hasOwnProperty.call(payload, 'note')
      ? (payload.note || undefined)
      : basePayment?.note,
    created_at: basePayment?.created_at || options.createdAt || new Date().toISOString(),
    customer_name: customerId != null ? customers.get(customerId)?.name || basePayment?.customer_name : basePayment?.customer_name,
    allocations: Array.isArray(basePayment?.allocations) ? basePayment.allocations : [],
    is_offline_record: basePayment?.is_offline_record ?? options.paymentId < 0,
    sync_status: 'pending',
    offline_deleted: false,
    client_operation_id: options.clientOperationId,
  });
};

const buildLocalSaleRecord = async (
  businessId: number,
  payload: Record<string, any>,
  options: { baseSale?: Sale | null; saleId: number; clientOperationId: string; createdAt?: string }
): Promise<Sale> => {
  const { customers, treasuryAccounts, products } = await getLocalReferenceMaps(businessId);
  const baseSale = options.baseSale || null;
  const items = Array.isArray(payload.items) ? payload.items : (baseSale?.items || []);
  const subtotal = Number(payload.subtotal ?? items.reduce((sum: number, item: any) => sum + Number(item?.total || 0), 0));
  const discount = Number(payload.discount ?? baseSale?.discount ?? 0);
  const total = Number(payload.total ?? Math.max(subtotal - discount, 0));
  const collectedAmount = Number(
    payload.collected_amount
    ?? payload.amount_paid
    ?? baseSale?.collected_amount
    ?? 0
  );
  const isPaid = payload.paid != null
    ? Boolean(payload.paid) || total - collectedAmount <= 0.01
    : total - collectedAmount <= 0.01;
  const balance = isPaid ? 0 : Math.max(total - collectedAmount, 0);
  const customerId = Object.prototype.hasOwnProperty.call(payload, 'customer_id')
    ? (payload.customer_id == null || payload.customer_id === '' ? undefined : Number(payload.customer_id))
    : baseSale?.customer_id;
  const treasuryAccountId = Object.prototype.hasOwnProperty.call(payload, 'treasury_account_id')
    ? (payload.treasury_account_id == null || payload.treasury_account_id === '' ? null : Number(payload.treasury_account_id))
    : baseSale?.treasury_account_id ?? null;
  const treasuryAccount = treasuryAccountId != null ? treasuryAccounts.get(treasuryAccountId) : null;
  const totalCost = items.reduce((sum: number, item: any) => {
    const productId = item?.product_id != null ? Number(item.product_id) : null;
    const product = productId != null ? products.get(productId) : null;
    return sum + (Number(product?.cost || 0) * Number(item?.qty || 0));
  }, 0);

  return normalizeSale({
    ...baseSale,
    id: options.saleId,
    business_id: businessId,
    customer_id: customerId,
    customer_name: customerId != null ? customers.get(customerId)?.name || baseSale?.customer_name : undefined,
    sale_date: String(payload.sale_date || baseSale?.sale_date || new Date().toISOString().split('T')[0]),
    items,
    subtotal,
    discount,
    total,
    balance,
    collected_amount: roundCurrency(isPaid ? total : collectedAmount),
    total_cost: roundCurrency(totalCost),
    payment_method: String(payload.payment_method || baseSale?.payment_method || 'cash'),
    treasury_account_id: treasuryAccountId,
    treasury_account_name: treasuryAccount?.name || null,
    treasury_account_type: treasuryAccount?.account_type || null,
    paid: isPaid,
    note: Object.prototype.hasOwnProperty.call(payload, 'note')
      ? (payload.note || undefined)
      : baseSale?.note,
    created_at: baseSale?.created_at || options.createdAt || new Date().toISOString(),
    created_by_name: baseSale?.created_by_name,
    created_by_role: baseSale?.created_by_role,
    updated_by_user_id: baseSale?.updated_by_user_id,
    is_offline_record: baseSale?.is_offline_record ?? options.saleId < 0,
    sync_status: 'pending',
    offline_deleted: false,
    client_operation_id: options.clientOperationId,
  });
};

const reversePaymentAllocations = (salesById: Map<number, Sale>, payment: Payment) => {
  for (const allocation of payment.allocations || []) {
    const sale = salesById.get(Number(allocation.sale_id));
    if (!sale) continue;
    sale.balance = roundCurrency(Number(sale.balance || 0) + Number(allocation.amount || 0));
    sale.collected_amount = roundCurrency(Math.max(0, Number(sale.collected_amount || 0) - Number(allocation.amount || 0)));
    sale.paid = sale.balance <= 0.01;
  }
};

const applyPaymentAllocations = (salesById: Map<number, Sale>, payment: Payment): PaymentAllocation[] => {
  const allocations: PaymentAllocation[] = [];
  let remaining = roundCurrency(Number(payment.amount || 0));

  for (const sale of sortSalesByDateAsc(Array.from(salesById.values()))) {
    if (remaining <= 0.01) break;
    if (sale.customer_id !== payment.customer_id || sale.offline_deleted) continue;

    const availableBalance = roundCurrency(Number(sale.balance || 0));
    if (availableBalance <= 0.01) continue;

    const amount = roundCurrency(Math.min(availableBalance, remaining));
    if (amount <= 0.01) continue;

    sale.balance = roundCurrency(availableBalance - amount);
    sale.collected_amount = roundCurrency(Number(sale.collected_amount || 0) + amount);
    sale.paid = sale.balance <= 0.01;
    allocations.push({ sale_id: sale.id, amount });
    remaining = roundCurrency(remaining - amount);
  }

  return allocations;
};

const rebuildLocalSalePaymentState = async (businessId: number) => {
  const sales = (await offlineDb.getEntities<Sale>('sales', businessId)).map(normalizeSale);
  const rawPayments = await offlineDb.getEntities<Payment>('payments', businessId);
  const payments = rawPayments.map(normalizePayment);
  const visibleSales = filterVisibleRecords(sales);
  const visiblePayments = filterVisibleRecords(payments);
  const salesById = new Map<number, Sale>(visibleSales.map((sale) => [sale.id, normalizeSale({ ...sale })]));

  const hasUnknownAllocations = rawPayments
    .filter((payment) => !isOfflineDeletedRecord(payment as OfflineEntityRecord))
    .some((payment) => !Object.prototype.hasOwnProperty.call(payment, 'allocations'));
  if (hasUnknownAllocations) {
    throw new Error('Necesitas volver a sincronizar online una vez antes de editar o eliminar cobros sin conexiÃ³n');
  }

  for (const payment of payments) {
    reversePaymentAllocations(salesById, payment);
  }

  const rebuiltPayments = sortPaymentsByDateAsc(visiblePayments).map((payment) => {
    const nextPayment = normalizePayment({ ...payment, allocations: [] });
    nextPayment.allocations = applyPaymentAllocations(salesById, nextPayment);
    return nextPayment;
  });

  await Promise.all([
    offlineDb.putEntities('sales', businessId, Array.from(salesById.values()).map(normalizeSale), (sale) => sale.id),
    offlineDb.putEntities('payments', businessId, rebuiltPayments.map(normalizePayment), (payment) => payment.id),
  ]);
};

export const offlineSyncService = {
  isEnabled() {
    return isOfflineSyncEnabled() && typeof window !== 'undefined' && 'indexedDB' in window;
  },

  emitChange: emitOfflineSyncEvent,

  async cacheBusinesses(businesses: Business[]) {
    if (!this.isEnabled()) return;
    const scopeId = toBusinessScope();
    await offlineDb.putEntities('businesses', scopeId, businesses, (business) => business.id);
  },

  async cacheBusiness(business: Business) {
    if (!this.isEnabled()) return;
    const scopeId = toBusinessScope();
    await offlineDb.upsertEntity('businesses', scopeId, business.id, business);
  },

  async cacheCustomers(businessId: number, customers: Customer[]) {
    if (!this.isEnabled()) return;
    const localCustomers = await offlineDb.getEntities<Customer>('customers', businessId);
    const mergedCustomers = mergeWithPendingLocalRecords(customers, localCustomers);
    await offlineDb.putEntities('customers', businessId, mergedCustomers, (customer) => customer.id);
  },

  async cacheProducts(businessId: number, products: Product[]) {
    if (!this.isEnabled()) return;
    const localProducts = await offlineDb.getEntities<Product>('products', businessId);
    const mergedProducts = mergeWithPendingLocalRecords(products, localProducts);
    await offlineDb.putEntities('products', businessId, mergedProducts, (product) => product.id);
  },

  async cacheSales(businessId: number, sales: Sale[]) {
    if (!this.isEnabled()) return;
    const localSales = await offlineDb.getEntities<Sale>('sales', businessId);
    const localSalesById = new Map(localSales.map((sale) => [sale.id, sale]));
    const normalizedRemoteSales = sales.map((sale) => {
      const localSale = localSalesById.get(sale.id);
      const remoteItems = Array.isArray(sale.items) ? sale.items : [];
      const localItems = Array.isArray(localSale?.items) ? localSale.items : [];
      if (remoteItems.length > 0 || localItems.length === 0) {
        return normalizeSale(sale);
      }
      return normalizeSale({
        ...sale,
        items: localItems,
      });
    });
    const mergedSales = mergeWithPendingLocalRecords(normalizedRemoteSales, localSales).map(normalizeSale);
    await offlineDb.putEntities('sales', businessId, mergedSales, (sale) => sale.id);
  },

  async cachePayments(businessId: number, payments: Payment[]) {
    if (!this.isEnabled()) return;
    const localPayments = await offlineDb.getEntities<Payment>('payments', businessId);
    const localPaymentsById = new Map(localPayments.map((payment) => [payment.id, payment]));
    const normalizedRemotePayments = payments.map((payment) => {
      const localPayment = localPaymentsById.get(payment.id);
      if (Object.prototype.hasOwnProperty.call(payment, 'allocations')) {
        return payment;
      }
      if (!localPayment || !Object.prototype.hasOwnProperty.call(localPayment, 'allocations')) {
        return payment;
      }
      return {
        ...payment,
        allocations: Array.isArray(localPayment.allocations) ? localPayment.allocations : [],
      };
    });
    const mergedPayments = mergeWithPendingLocalRecords(normalizedRemotePayments, localPayments);
    await offlineDb.putEntities('payments', businessId, mergedPayments, (payment) => payment.id);
  },

  async cacheInvoices(businessId: number, invoices: Invoice[]) {
    if (!this.isEnabled()) return;
    const localInvoices = await offlineDb.getEntities<Invoice>('invoices', businessId);
    const normalizedRemoteInvoices = invoices.map(normalizeInvoice);
    const normalizedLocalInvoices = localInvoices.map(normalizeInvoice);
    const remoteIds = new Set(normalizedRemoteInvoices.map((invoice) => invoice.id));
    const localById = new Map(normalizedLocalInvoices.map((invoice) => [invoice.id, invoice]));

    const mergedInvoices = [
      ...normalizedRemoteInvoices.map((invoice) => {
        const localInvoice = localById.get(invoice.id);
        if (!localInvoice || !hasPendingInvoiceLocalState(localInvoice)) {
          return invoice;
        }
        return withInvoiceRecordSyncStatus(
          normalizeInvoice({
            ...localInvoice,
            customer_name: invoice.customer_name || localInvoice.customer_name,
            customer_phone: invoice.customer_phone || localInvoice.customer_phone,
            customer_address: invoice.customer_address || localInvoice.customer_address,
            invoice_number: invoice.invoice_number || localInvoice.invoice_number,
            created_at: invoice.created_at || localInvoice.created_at,
          }),
          [],
          localInvoice.sync_status || 'pending'
        );
      }),
      ...normalizedLocalInvoices.filter((invoice) => !remoteIds.has(invoice.id) && hasPendingInvoiceLocalState(invoice)),
    ].map(normalizeInvoice);
    await offlineDb.putEntities('invoices', businessId, mergedInvoices, (invoice) => invoice.id);
  },

  async cacheTreasuryAccounts(businessId: number, accounts: TreasuryAccount[]) {
    if (!this.isEnabled()) return;
    await offlineDb.putEntities('treasury_accounts', businessId, accounts, (account) => account.id);
  },

  async getBusinessesFromLocal() {
    if (!this.isEnabled()) return [] as Business[];
    const scopeId = toBusinessScope();
    return offlineDb.getEntities<Business>('businesses', scopeId);
  },

  async getBusinessFromLocal(businessId: number) {
    if (!this.isEnabled()) return null;
    const scopeId = toBusinessScope();
    return offlineDb.getEntity<Business>('businesses', scopeId, businessId);
  },

  async getCustomersFromLocal(businessId: number) {
    if (!this.isEnabled()) return [] as Customer[];
    return filterVisibleRecords(await offlineDb.getEntities<Customer>('customers', businessId));
  },

  async getProductsFromLocal(businessId: number) {
    if (!this.isEnabled()) return [] as Product[];
    return filterVisibleRecords(await offlineDb.getEntities<Product>('products', businessId));
  },

  async getSalesFromLocal(businessId: number) {
    if (!this.isEnabled()) return [] as Sale[];
    return filterVisibleRecords((await offlineDb.getEntities<Sale>('sales', businessId)).map(normalizeSale));
  },

  async getPaymentsFromLocal(businessId: number) {
    if (!this.isEnabled()) return [] as Payment[];
    return filterVisibleRecords((await offlineDb.getEntities<Payment>('payments', businessId)).map(normalizePayment));
  },

  async getInvoicesFromLocal(businessId: number) {
    if (!this.isEnabled()) return [] as Invoice[];
    return filterVisibleRecords((await offlineDb.getEntities<Invoice>('invoices', businessId)).map(normalizeInvoice));
  },

  async getInvoiceFromLocal(businessId: number, invoiceId: number) {
    if (!this.isEnabled()) return null;
    const resolvedId = await getMappedId('invoice', businessId, invoiceId);
    if (resolvedId == null || !Number.isFinite(Number(resolvedId))) {
      return null;
    }
    const invoice = await offlineDb.getEntity<Invoice>('invoices', businessId, Number(resolvedId));
    return invoice ? normalizeInvoice(invoice) : null;
  },

  async getTreasuryAccountsFromLocal(businessId: number) {
    if (!this.isEnabled()) return [] as TreasuryAccount[];
    return offlineDb.getEntities<TreasuryAccount>('treasury_accounts', businessId);
  },

  async buildReceivablesOverviewFromLocal(businessId: number): Promise<ReceivablesOverview> {
    const [business, customers, sales] = await Promise.all([
      this.getBusinessFromLocal(businessId),
      this.getCustomersFromLocal(businessId),
      this.getSalesFromLocal(businessId),
    ]);

    const { defaultTermDays, dueSoonDays, overrides } = getBusinessTermConfig(business);
    const receivables: ReceivableItem[] = [];
    const customerMap = new Map<number, Customer>();
    customers.forEach((customer) => customerMap.set(customer.id, customer));

    sortSalesByDateAsc(sales)
      .filter((sale) => sale.customer_id && Number(sale.balance || 0) > 0.01)
      .forEach((sale) => {
        const customerId = Number(sale.customer_id);
        const override = overrides?.[String(sale.id)];
        const termDays = typeof override?.term_days === 'number' ? override.term_days : defaultTermDays;
        const dueDate = addDays(sale.sale_date, termDays);
        const statusInfo = computeReceivableStatus(dueDate, dueSoonDays);
        const customer = customerMap.get(customerId);

        receivables.push({
          sale_id: sale.id,
          customer_id: customerId,
          customer_name: sale.customer_name || customer?.name || 'Cliente',
          customer_phone: customer?.phone || null,
          document_label: `Venta #${sale.id}`,
          original_amount: Number(sale.total || 0),
          total_paid: Number(sale.collected_amount || 0),
          pending_balance: Number(sale.balance || 0),
          base_date: sale.sale_date,
          term_days: termDays,
          due_date: dueDate,
          status: statusInfo.status,
          status_label: statusInfo.statusLabel,
          days_until_due: statusInfo.daysUntilDue,
          days_overdue: statusInfo.daysOverdue,
        });
      });

    const summaryByCustomer = new Map<number, ReceivablesCustomerSummary>();

    receivables.forEach((item) => {
      const current = summaryByCustomer.get(item.customer_id) || {
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone || null,
        total_balance: 0,
        overdue_balance: 0,
        due_soon_balance: 0,
        due_today_balance: 0,
        current_balance: 0,
        invoice_count: 0,
        oldest_base_date: item.base_date,
        nearest_due_date: item.due_date,
        max_days_overdue: 0,
        status: 'current',
        status_label: 'Al día',
      };

      current.total_balance += item.pending_balance;
      current.invoice_count += 1;

      if (!current.oldest_base_date || new Date(item.base_date).getTime() < new Date(current.oldest_base_date).getTime()) {
        current.oldest_base_date = item.base_date;
      }

      if (!current.nearest_due_date || new Date(item.due_date).getTime() < new Date(current.nearest_due_date).getTime()) {
        current.nearest_due_date = item.due_date;
      }

      if (item.status === 'overdue') {
        current.overdue_balance += item.pending_balance;
        current.max_days_overdue = Math.max(current.max_days_overdue, item.days_overdue);
        current.status = 'overdue';
        current.status_label = 'Vencido';
      } else if (item.status === 'due_today' && current.status !== 'overdue') {
        current.due_today_balance += item.pending_balance;
        current.status = 'due_today';
        current.status_label = 'Vence hoy';
      } else if (item.status === 'due_soon' && current.status !== 'overdue' && current.status !== 'due_today') {
        current.due_soon_balance += item.pending_balance;
        current.status = 'due_soon';
        current.status_label = 'Por vencer';
      } else if (item.status === 'current' && current.status === 'current') {
        current.current_balance += item.pending_balance;
      } else {
        current.current_balance += item.pending_balance;
      }

      summaryByCustomer.set(item.customer_id, current);
    });

    const customerSummaries = Array.from(summaryByCustomer.values()).sort((a, b) => b.total_balance - a.total_balance);

    return {
      summary: {
        total_pending: receivables.reduce((sum, item) => sum + item.pending_balance, 0),
        customers_with_balance: customerSummaries.length,
        open_count: receivables.length,
        overdue_total: receivables.filter((item) => item.status === 'overdue').reduce((sum, item) => sum + item.pending_balance, 0),
        due_soon_total: receivables.filter((item) => item.status === 'due_soon').reduce((sum, item) => sum + item.pending_balance, 0),
        due_today_total: receivables.filter((item) => item.status === 'due_today').reduce((sum, item) => sum + item.pending_balance, 0),
        current_total: receivables.filter((item) => item.status === 'current').reduce((sum, item) => sum + item.pending_balance, 0),
      },
      customers: customerSummaries,
      receivables,
      settings: {
        default_term_days: defaultTermDays,
        due_soon_days: dueSoonDays,
      },
    };
  },

  async buildInvoiceReceivablesOverviewFromLocal(
    businessId: number,
    filters?: { status?: string; search?: string; customer_id?: number; start_date?: string; end_date?: string }
  ): Promise<InvoiceReceivablesOverview> {
    const invoices = await this.getInvoicesFromLocal(businessId);
    return buildInvoiceReceivablesOverview(invoices, {
      status: filters?.status,
      search: filters?.search,
      customerId: filters?.customer_id ?? null,
      startDate: filters?.start_date,
      endDate: filters?.end_date,
    });
  },

  async buildInvoiceCustomerStatementFromLocal(
    businessId: number,
    customerId: number,
    filters?: { start_date?: string; end_date?: string }
  ): Promise<InvoiceCustomerStatement> {
    const [invoices, customers] = await Promise.all([
      this.getInvoicesFromLocal(businessId),
      this.getCustomersFromLocal(businessId),
    ]);
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) {
      throw new Error('Cliente no disponible en cache local');
    }
    return buildInvoiceCustomerStatement(invoices, customer, {
      startDate: filters?.start_date,
      endDate: filters?.end_date,
    });
  },

  async getMappedEntityId(entityType: SyncEntityType, businessId: number, entityId: number) {
    const mappedId = await getMappedId(entityType, businessId, entityId);
    return typeof mappedId === 'number' ? mappedId : Number(mappedId || entityId);
  },

  async getOfflineMergedCustomers(businessId: number): Promise<{ customers: Customer[]; debtTermDays: number }> {
    const [baseCustomers, business, overview] = await Promise.all([
      this.getCustomersFromLocal(businessId),
      this.getBusinessFromLocal(businessId),
      this.buildReceivablesOverviewFromLocal(businessId),
    ]);

    const termDays = overview.settings.default_term_days || 30;
    const summaryMap = new Map(overview.customers.map((item) => [item.customer_id, item]));

    return {
      debtTermDays: typeof business?.settings?.debt_term_days === 'number' ? business.settings.debt_term_days : termDays,
      customers: baseCustomers.map((customer) => {
        const summary = summaryMap.get(customer.id);
        return {
          ...customer,
          balance: summary?.total_balance || 0,
          oldest_due_date: summary?.oldest_base_date || undefined,
          days_since_oldest: summary?.max_days_overdue || 0,
          is_overdue: summary?.status === 'overdue',
          receivable_status: summary?.status,
          receivable_status_label: summary?.status_label,
          receivable_due_date: summary?.nearest_due_date || undefined,
          receivable_term_days: summary ? termDays : undefined,
          receivable_days_until_due: summary?.nearest_due_date
            ? Math.ceil((new Date(summary.nearest_due_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
            : undefined,
          receivable_days_overdue: summary?.max_days_overdue || 0,
          overdue_balance: summary?.overdue_balance || 0,
          due_soon_balance: summary?.due_soon_balance || 0,
          due_today_balance: summary?.due_today_balance || 0,
          current_balance: summary?.current_balance || 0,
          receivable_invoice_count: summary?.invoice_count || 0,
        };
      }),
    };
  },

  async prepareOfflineSnapshot(businessId: number) {
    if (!this.isEnabled() || !navigator.onLine) return;

    const businessesPayload = await authorizedJsonRequest<{ businesses: Business[] }>('/businesses');
    const businessPayload = await authorizedJsonRequest<{ business: Business }>(`/businesses/${businessId}`);
    const business = businessPayload.business;

    await Promise.all([
      this.cacheBusinesses(businessesPayload.businesses || []),
      this.cacheBusiness(business),
    ]);

    if (canSnapshotResource(business, { moduleKey: 'customers', permission: 'customers.read' })) {
      try {
        const customersPayload = await authorizedJsonRequest<{ customers: Customer[] }>(`/businesses/${businessId}/customers`);
        await this.cacheCustomers(businessId, customersPayload.customers || []);
      } catch {}
    }

    if (canSnapshotResource(business, { moduleKey: 'products', permission: 'products.read' })) {
      try {
        const productsPayload = await authorizedJsonRequest<{ products: Product[] }>(`/businesses/${businessId}/products`);
        await this.cacheProducts(businessId, productsPayload.products || []);
      } catch {}
    }

    if (canSnapshotResource(business, { moduleKey: 'sales', permission: 'sales.read' })) {
      try {
        const salesPayload = await authorizedJsonRequest<{ sales: Sale[] }>(`/businesses/${businessId}/sales?include_items=true`);
        await this.cacheSales(businessId, salesPayload.sales || []);
      } catch {}
      if (isBackendCapabilitySupported('invoices')) {
        try {
          const invoicesPayload = await authorizedJsonRequest<{ invoices: Invoice[] }>(`/businesses/${businessId}/invoices`);
          await this.cacheInvoices(businessId, invoicesPayload.invoices || []);
        } catch {}
      }
    }

    if (canSnapshotResource(business, { moduleKey: 'accounts_receivable', permission: 'payments.read' })) {
      try {
        const paymentsPayload = await authorizedJsonRequest<{ payments: Payment[] }>(`/businesses/${businessId}/payments?include_allocations=true`);
        await this.cachePayments(businessId, paymentsPayload.payments || []);
      } catch {}
    }

    if (canSnapshotResource(business, { permission: 'treasury.read' }) && isBackendCapabilitySupported('treasury')) {
      try {
        const treasuryPayload = await authorizedJsonRequest<{ accounts: TreasuryAccount[] }>(`/businesses/${businessId}/treasury/accounts?include_inactive=1`);
        await this.cacheTreasuryAccounts(businessId, treasuryPayload.accounts || []);
      } catch {}
    }

    await updateLastSyncAt(businessId, new Date().toISOString());
    emitOfflineSnapshotApplied([businessId]);
  },

  async createOfflineSale(businessId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const tempId = createTempId();
    const clientOperationId = createClientOperationId('sale');
    const sale = await buildLocalSaleRecord(businessId, payload, { saleId: tempId, clientOperationId });

    await offlineDb.upsertEntity('sales', businessId, tempId, sale);
    await rebuildLocalSalePaymentState(businessId);

    await queueOperation({
      id: clientOperationId,
      businessId,
      entityType: 'sale',
      action: 'create',
      entityId: tempId,
      endpoint: `/businesses/${businessId}/sales`,
      payload,
      tempId,
      clientOperationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      error: null,
    });

    return (await offlineDb.getEntity<Sale>('sales', businessId, tempId)) || sale;
  },

  async createOfflinePayment(businessId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const tempId = createTempId();
    const clientOperationId = createClientOperationId('payment');
    const payment = await buildLocalPaymentRecord(businessId, payload, { paymentId: tempId, clientOperationId });

    await offlineDb.upsertEntity('payments', businessId, tempId, payment);
    await rebuildLocalSalePaymentState(businessId);

    await queueOperation({
      id: clientOperationId,
      businessId,
      entityType: 'payment',
      action: 'create',
      entityId: tempId,
      endpoint: `/businesses/${businessId}/payments`,
      payload,
      tempId,
      clientOperationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      error: null,
    });

    return (await offlineDb.getEntity<Payment>('payments', businessId, tempId)) || payment;
  },

  async createOfflineInvoice(businessId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }
    if (!isBackendCapabilitySupported('invoices')) {
      throw new Error('Facturas no está disponible en el backend actual');
    }

    const [business, customers, products] = await Promise.all([
      this.getBusinessFromLocal(businessId),
      this.getCustomersFromLocal(businessId),
      this.getProductsFromLocal(businessId),
    ]);
    const tempId = createTempId();
    const clientOperationId = createClientOperationId('invoice');
    const invoice = buildOfflineInvoiceRecord(
      {
        customers: new Map(customers.map((customer) => [customer.id, customer])),
        products: new Map(products.map((product) => [product.id, product])),
      },
      payload,
      {
        businessId,
        invoiceId: tempId,
        clientOperationId,
        currency: business?.currency || 'COP',
        currentUserName: getStoredUser()?.name || null,
        numberPrefix: buildPendingInvoiceNumberLabel(tempId).split('-PEND-')[0],
      }
    );

    await offlineDb.upsertEntity('invoices', businessId, tempId, invoice);
    await queueOperation({
      id: clientOperationId,
      businessId,
      entityType: 'invoice',
      action: 'create',
      entityId: tempId,
      endpoint: `/businesses/${businessId}/invoices`,
      payload,
      tempId,
      clientOperationId,
      entityLabel: invoice.invoice_number,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      error: null,
    });

    return (await offlineDb.getEntity<Invoice>('invoices', businessId, tempId)) || invoice;
  },

  async updateOfflineInvoice(businessId: number, invoiceId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }
    if (!isBackendCapabilitySupported('invoices')) {
      throw new Error('Facturas no está disponible en el backend actual');
    }

    const resolvedInvoiceId = Number(await getMappedId('invoice', businessId, invoiceId));
    const [business, customers, products, currentInvoice] = await Promise.all([
      this.getBusinessFromLocal(businessId),
      this.getCustomersFromLocal(businessId),
      this.getProductsFromLocal(businessId),
      this.getInvoiceFromLocal(businessId, resolvedInvoiceId),
    ]);

    if (!currentInvoice) {
      throw new Error('Factura no disponible para edicion offline');
    }
    if (currentInvoice.offline_deleted) {
      throw new Error('Esta factura ya esta pendiente de eliminacion');
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'invoice', resolvedInvoiceId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    const pendingUpdates = pendingOperations.filter((operation) => operation.action === 'update');
    const clientOperationId = pendingCreate?.clientOperationId || currentInvoice.client_operation_id || createClientOperationId('invoice');
    const baseUpdatedAt = pendingUpdates[0]?.baseUpdatedAt || currentInvoice.updated_at || null;

    const nextInvoice = buildOfflineInvoiceRecord(
      {
        customers: new Map(customers.map((customer) => [customer.id, customer])),
        products: new Map(products.map((product) => [product.id, product])),
      },
      payload,
      {
        baseInvoice: currentInvoice,
        businessId,
        invoiceId: resolvedInvoiceId,
        clientOperationId,
        currency: business?.currency || currentInvoice.currency || 'COP',
        currentUserName: getStoredUser()?.name || null,
        numberPrefix: String(currentInvoice.invoice_number || '').split('-')[0] || 'INV',
      }
    );

    if (pendingCreate) {
      await replacePendingOperation(pendingCreate, {
        payload: { ...pendingCreate.payload, ...payload },
        error: null,
        status: 'pending',
      });
    } else if (pendingUpdates.length > 0) {
      const baseOperation = pendingUpdates[0];
      const nextPayload = pendingUpdates.reduce((acc, operation) => ({ ...acc, ...operation.payload }), { ...baseOperation.payload, ...payload });
      await removePendingOperations(pendingUpdates.slice(1));
      await replacePendingOperation(baseOperation, {
        payload: { ...nextPayload, expected_updated_at: baseOperation.baseUpdatedAt || nextPayload.expected_updated_at || baseUpdatedAt },
        error: null,
        errorCategory: null,
        conflict: null,
        status: 'pending',
      });
    } else {
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'invoice',
        action: 'update',
        entityId: resolvedInvoiceId,
        endpoint: `/businesses/${businessId}/invoices/${resolvedInvoiceId}`,
        payload: {
          ...payload,
          expected_updated_at: baseUpdatedAt,
        },
        tempId: null,
        clientOperationId,
        baseUpdatedAt,
        entityLabel: currentInvoice.invoice_number,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('invoices', businessId, resolvedInvoiceId, nextInvoice);
    emitOfflineSyncEvent();
    return (await offlineDb.getEntity<Invoice>('invoices', businessId, resolvedInvoiceId)) || nextInvoice;
  },

  async updateOfflineInvoiceStatus(businessId: number, invoiceId: number, status: 'draft' | 'sent' | 'cancelled') {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }
    if (!isBackendCapabilitySupported('invoices')) {
      throw new Error('Facturas no está disponible en el backend actual');
    }

    const resolvedInvoiceId = Number(await getMappedId('invoice', businessId, invoiceId));
    const currentInvoice = await this.getInvoiceFromLocal(businessId, resolvedInvoiceId);
    if (!currentInvoice) {
      throw new Error('Factura no disponible para cambios offline');
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'invoice', resolvedInvoiceId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    const pendingStatus = pendingOperations.filter((operation) => operation.action === 'status_update');
    const baseUpdatedAt = pendingStatus[0]?.baseUpdatedAt || currentInvoice.updated_at || null;
    const nextInvoice = applyOfflineInvoiceStatus(currentInvoice, status);

    if (pendingCreate) {
      await replacePendingOperation(pendingCreate, {
        payload: { ...pendingCreate.payload, status },
        error: null,
        status: 'pending',
      });
    } else if (pendingStatus.length > 0) {
      const baseOperation = pendingStatus[0];
      await removePendingOperations(pendingStatus.slice(1));
      await replacePendingOperation(baseOperation, {
        payload: {
          status,
          expected_updated_at: baseOperation.baseUpdatedAt || baseUpdatedAt,
        },
        baseUpdatedAt: baseOperation.baseUpdatedAt || baseUpdatedAt,
        error: null,
        errorCategory: null,
        conflict: null,
        status: 'pending',
      });
    } else {
      const clientOperationId = createClientOperationId('invoice');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'invoice',
        action: 'status_update',
        entityId: resolvedInvoiceId,
        endpoint: `/businesses/${businessId}/invoices/${resolvedInvoiceId}/status`,
        payload: { status, invoice_id: resolvedInvoiceId, expected_updated_at: baseUpdatedAt },
        tempId: null,
        clientOperationId,
        baseUpdatedAt,
        entityLabel: currentInvoice.invoice_number,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
      nextInvoice.client_operation_id = clientOperationId;
    }

    await offlineDb.upsertEntity('invoices', businessId, resolvedInvoiceId, nextInvoice);
    emitOfflineSyncEvent();
    return (await offlineDb.getEntity<Invoice>('invoices', businessId, resolvedInvoiceId)) || nextInvoice;
  },

  async createOfflineInvoicePayment(businessId: number, invoiceId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }
    if (!isBackendCapabilitySupported('invoices')) {
      throw new Error('Facturas no está disponible en el backend actual');
    }

    const resolvedInvoiceId = Number(await getMappedId('invoice', businessId, invoiceId));
    const currentInvoice = await this.getInvoiceFromLocal(businessId, resolvedInvoiceId);
    if (!currentInvoice) {
      throw new Error('Factura no disponible para registrar pagos offline');
    }

    const clientOperationId = createClientOperationId('invoice');
    const tempPaymentId = createTempId();
    const payment = buildOfflineInvoicePaymentRecord(currentInvoice, payload, {
      paymentId: tempPaymentId,
      clientOperationId,
      currentUserName: getStoredUser()?.name || null,
    });
    const nextInvoice = applyOfflineInvoicePayment(currentInvoice, payment);

    await offlineDb.upsertEntity('invoices', businessId, resolvedInvoiceId, nextInvoice);
    await queueOperation({
      id: clientOperationId,
      businessId,
      entityType: 'invoice',
      action: 'payment_create',
      entityId: resolvedInvoiceId,
      endpoint: `/businesses/${businessId}/invoices/${resolvedInvoiceId}/payments`,
      payload: {
        ...payload,
        invoice_id: resolvedInvoiceId,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        note: payment.note,
      },
      tempId: tempPaymentId,
      clientOperationId,
      entityLabel: currentInvoice.invoice_number,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      error: null,
    });

    emitOfflineSyncEvent();
    return (await offlineDb.getEntity<Invoice>('invoices', businessId, resolvedInvoiceId)) || nextInvoice;
  },

  async updateOfflineSale(businessId: number, saleId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const currentSale = await offlineDb.getEntity<Sale>('sales', businessId, saleId);
    if (!currentSale) {
      throw new Error('Venta no disponible para edición offline');
    }
    if (currentSale.offline_deleted) {
      throw new Error('Esta venta ya está pendiente de eliminación');
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'sale', saleId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    const pendingUpdates = pendingOperations.filter((operation) => operation.action === 'update');
    const clientOperationId = pendingCreate?.clientOperationId || currentSale.client_operation_id || createClientOperationId('sale');
    const nextSale = await buildLocalSaleRecord(businessId, payload, {
      baseSale: currentSale,
      saleId,
      clientOperationId,
    });

    if (pendingCreate) {
      await replacePendingOperation(pendingCreate, {
        payload: { ...pendingCreate.payload, ...payload },
        error: null,
        status: 'pending',
      });
    } else if (pendingUpdates.length > 0) {
      const baseOperation = pendingUpdates[0];
      const nextPayload = pendingUpdates.reduce((acc, operation) => ({ ...acc, ...operation.payload }), { ...baseOperation.payload, ...payload });
      await removePendingOperations(pendingUpdates.slice(1));
      await replacePendingOperation(baseOperation, { payload: nextPayload, error: null, status: 'pending' });
    } else {
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'sale',
        action: 'update',
        entityId: saleId,
        endpoint: `/businesses/${businessId}/sales/${saleId}`,
        payload,
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('sales', businessId, saleId, nextSale);
    await rebuildLocalSalePaymentState(businessId);
    emitOfflineSyncEvent();
    return (await offlineDb.getEntity<Sale>('sales', businessId, saleId)) || nextSale;
  },

  async deleteOfflineSale(businessId: number, saleId: number) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const currentSale = await offlineDb.getEntity<Sale>('sales', businessId, saleId);
    if (!currentSale) {
      return;
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'sale', saleId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    if (pendingCreate) {
      await removePendingOperations(pendingOperations);
      await offlineDb.deleteEntity('sales', businessId, saleId);
      await rebuildLocalSalePaymentState(businessId);
      emitOfflineSyncEvent();
      return;
    }

    const pendingDelete = pendingOperations.find((operation) => operation.action === 'delete');
    if (!pendingDelete) {
      await removePendingOperations(pendingOperations.filter((operation) => operation.action === 'update'));
      const clientOperationId = createClientOperationId('sale');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'sale',
        action: 'delete',
        entityId: saleId,
        endpoint: `/businesses/${businessId}/sales/${saleId}`,
        payload: {},
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('sales', businessId, saleId, {
      ...currentSale,
      offline_deleted: true,
      sync_status: 'pending',
      is_offline_record: false,
    });
    await rebuildLocalSalePaymentState(businessId);
    emitOfflineSyncEvent();
  },

  async updateOfflinePayment(businessId: number, paymentId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const currentPayment = await offlineDb.getEntity<Payment>('payments', businessId, paymentId);
    if (!currentPayment) {
      throw new Error('Pago no disponible para edición offline');
    }
    if (currentPayment.offline_deleted) {
      throw new Error('Este pago ya está pendiente de eliminación');
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'payment', paymentId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    const pendingUpdates = pendingOperations.filter((operation) => operation.action === 'update');
    const clientOperationId = pendingCreate?.clientOperationId || currentPayment.client_operation_id || createClientOperationId('payment');
    const nextPayment = await buildLocalPaymentRecord(businessId, payload, {
      basePayment: currentPayment,
      paymentId,
      clientOperationId,
    });

    if (pendingCreate) {
      await replacePendingOperation(pendingCreate, {
        payload: { ...pendingCreate.payload, ...payload },
        error: null,
        status: 'pending',
      });
    } else if (pendingUpdates.length > 0) {
      const baseOperation = pendingUpdates[0];
      const nextPayload = pendingUpdates.reduce((acc, operation) => ({ ...acc, ...operation.payload }), { ...baseOperation.payload, ...payload });
      await removePendingOperations(pendingUpdates.slice(1));
      await replacePendingOperation(baseOperation, { payload: nextPayload, error: null, status: 'pending' });
    } else {
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'payment',
        action: 'update',
        entityId: paymentId,
        endpoint: `/businesses/${businessId}/payments/${paymentId}`,
        payload,
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('payments', businessId, paymentId, nextPayment);
    await rebuildLocalSalePaymentState(businessId);
    emitOfflineSyncEvent();
    return (await offlineDb.getEntity<Payment>('payments', businessId, paymentId)) || nextPayment;
  },

  async deleteOfflinePayment(businessId: number, paymentId: number) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const currentPayment = await offlineDb.getEntity<Payment>('payments', businessId, paymentId);
    if (!currentPayment) {
      return;
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'payment', paymentId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    if (pendingCreate) {
      await removePendingOperations(pendingOperations);
      await offlineDb.deleteEntity('payments', businessId, paymentId);
      await rebuildLocalSalePaymentState(businessId);
      emitOfflineSyncEvent();
      return;
    }

    const pendingDelete = pendingOperations.find((operation) => operation.action === 'delete');
    if (!pendingDelete) {
      await removePendingOperations(pendingOperations.filter((operation) => operation.action === 'update'));
      const clientOperationId = createClientOperationId('payment');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'payment',
        action: 'delete',
        entityId: paymentId,
        endpoint: `/businesses/${businessId}/payments/${paymentId}`,
        payload: {},
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('payments', businessId, paymentId, {
      ...currentPayment,
      offline_deleted: true,
      sync_status: 'pending',
      is_offline_record: false,
    });
    await rebuildLocalSalePaymentState(businessId);
    emitOfflineSyncEvent();
  },

  async createOfflineCustomer(businessId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const sanitizedPayload = sanitizeCustomerPayload(payload);
    const tempId = createTempId();
    const clientOperationId = createClientOperationId('customer');
    const customer = buildOfflineCustomerRecord(businessId, sanitizedPayload, tempId, clientOperationId);

    await offlineDb.upsertEntity('customers', businessId, tempId, customer);
    await queueOperation({
      id: clientOperationId,
      businessId,
      entityType: 'customer',
      action: 'create',
      entityId: tempId,
      endpoint: `/businesses/${businessId}/customers`,
      payload: sanitizedPayload,
      tempId,
      clientOperationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      error: null,
    });

    return customer;
  },

  async updateOfflineCustomer(businessId: number, customerId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const sanitizedPayload = sanitizeCustomerPayload(payload);
    const currentCustomer = await offlineDb.getEntity<Customer>('customers', businessId, customerId);
    if (!currentCustomer) {
      throw new Error('Cliente no disponible para edición offline');
    }
    if (currentCustomer.offline_deleted) {
      throw new Error('Este cliente ya está pendiente de eliminación');
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'customer', customerId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    const pendingUpdates = pendingOperations.filter((operation) => operation.action === 'update');

    const nextCustomer: Customer = {
      ...currentCustomer,
      ...sanitizedPayload,
      sync_status: 'pending',
      offline_deleted: false,
      client_operation_id: pendingCreate?.clientOperationId || currentCustomer.client_operation_id,
    };

    if (pendingCreate) {
      const nextPayload = { ...pendingCreate.payload, ...sanitizedPayload };
      await replacePendingOperation(pendingCreate, { payload: nextPayload, error: null, status: 'pending' });
    } else if (pendingUpdates.length > 0) {
      const baseOperation = pendingUpdates[0];
      const nextPayload = pendingUpdates.reduce((acc, operation) => ({ ...acc, ...operation.payload }), { ...baseOperation.payload, ...sanitizedPayload });
      await removePendingOperations(pendingUpdates.slice(1));
      await replacePendingOperation(baseOperation, { payload: nextPayload, error: null, status: 'pending' });
    } else {
      const clientOperationId = createClientOperationId('customer');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'customer',
        action: 'update',
        entityId: customerId,
        endpoint: `/businesses/${businessId}/customers/${customerId}`,
        payload: sanitizedPayload,
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
      nextCustomer.client_operation_id = clientOperationId;
    }

    await offlineDb.upsertEntity('customers', businessId, customerId, nextCustomer);
    emitOfflineSyncEvent();
    return nextCustomer;
  },

  async deleteOfflineCustomer(businessId: number, customerId: number) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const currentCustomer = await offlineDb.getEntity<Customer>('customers', businessId, customerId);
    if (!currentCustomer) {
      return;
    }

    await ensureNoPendingOperationReferences(businessId, 'customer', customerId);

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'customer', customerId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    if (pendingCreate) {
      await removePendingOperations(pendingOperations);
      await offlineDb.deleteEntity('customers', businessId, customerId);
      emitOfflineSyncEvent();
      return;
    }

    const pendingDelete = pendingOperations.find((operation) => operation.action === 'delete');
    if (!pendingDelete) {
      await removePendingOperations(pendingOperations.filter((operation) => operation.action === 'update'));
      const clientOperationId = createClientOperationId('customer');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'customer',
        action: 'delete',
        entityId: customerId,
        endpoint: `/businesses/${businessId}/customers/${customerId}`,
        payload: {},
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('customers', businessId, customerId, {
      ...currentCustomer,
      offline_deleted: true,
      sync_status: 'pending',
      is_offline_record: false,
    });
    emitOfflineSyncEvent();
  },

  async createOfflineProduct(businessId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const sanitizedPayload = sanitizeProductPayload(payload);
    const tempId = createTempId();
    const clientOperationId = createClientOperationId('product');
    const product = buildOfflineProductRecord(businessId, sanitizedPayload, tempId, clientOperationId);

    await offlineDb.upsertEntity('products', businessId, tempId, product);
    await queueOperation({
      id: clientOperationId,
      businessId,
      entityType: 'product',
      action: 'create',
      entityId: tempId,
      endpoint: `/businesses/${businessId}/products`,
      payload: sanitizedPayload,
      tempId,
      clientOperationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      error: null,
    });

    return product;
  },

  async updateOfflineProduct(businessId: number, productId: number, payload: Record<string, any>) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const sanitizedPayload = sanitizeProductPayload(payload);
    const currentProduct = await offlineDb.getEntity<Product>('products', businessId, productId);
    if (!currentProduct) {
      throw new Error('Producto no disponible para edición offline');
    }
    if (currentProduct.offline_deleted) {
      throw new Error('Este producto ya está pendiente de eliminación');
    }

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'product', productId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    const pendingUpdates = pendingOperations.filter((operation) => operation.action === 'update');

    const nextProduct: Product = {
      ...currentProduct,
      ...sanitizedPayload,
      sync_status: 'pending',
      offline_deleted: false,
      client_operation_id: pendingCreate?.clientOperationId || currentProduct.client_operation_id,
    };

    if (pendingCreate) {
      const nextPayload = { ...pendingCreate.payload, ...sanitizedPayload };
      await replacePendingOperation(pendingCreate, { payload: nextPayload, error: null, status: 'pending' });
    } else if (pendingUpdates.length > 0) {
      const baseOperation = pendingUpdates[0];
      const nextPayload = pendingUpdates.reduce((acc, operation) => ({ ...acc, ...operation.payload }), { ...baseOperation.payload, ...sanitizedPayload });
      await removePendingOperations(pendingUpdates.slice(1));
      await replacePendingOperation(baseOperation, { payload: nextPayload, error: null, status: 'pending' });
    } else {
      const clientOperationId = createClientOperationId('product');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'product',
        action: 'update',
        entityId: productId,
        endpoint: `/businesses/${businessId}/products/${productId}`,
        payload: sanitizedPayload,
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
      nextProduct.client_operation_id = clientOperationId;
    }

    await offlineDb.upsertEntity('products', businessId, productId, nextProduct);
    emitOfflineSyncEvent();
    return nextProduct;
  },

  async deleteOfflineProduct(businessId: number, productId: number) {
    if (!this.isEnabled()) {
      throw new Error('Soporte offline no disponible en este dispositivo');
    }

    const currentProduct = await offlineDb.getEntity<Product>('products', businessId, productId);
    if (!currentProduct) {
      return;
    }

    await ensureNoPendingOperationReferences(businessId, 'product', productId);

    const pendingOperations = await listPendingOperationsForEntity(businessId, 'product', productId);
    const pendingCreate = pendingOperations.find((operation) => operation.action === 'create');
    if (pendingCreate) {
      await removePendingOperations(pendingOperations);
      await offlineDb.deleteEntity('products', businessId, productId);
      emitOfflineSyncEvent();
      return;
    }

    const pendingDelete = pendingOperations.find((operation) => operation.action === 'delete');
    if (!pendingDelete) {
      await removePendingOperations(pendingOperations.filter((operation) => operation.action === 'update'));
      const clientOperationId = createClientOperationId('product');
      await queueOperation({
        id: clientOperationId,
        businessId,
        entityType: 'product',
        action: 'delete',
        entityId: productId,
        endpoint: `/businesses/${businessId}/products/${productId}`,
        payload: {},
        tempId: null,
        clientOperationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      });
    }

    await offlineDb.upsertEntity('products', businessId, productId, {
      ...currentProduct,
      offline_deleted: true,
      sync_status: 'pending',
      is_offline_record: false,
    });
    emitOfflineSyncEvent();
  },

  async listInvoiceSyncOperations(businessId: number) {
    const operations = (await offlineDb.listSyncOperations(businessId))
      .filter((operation) => operation.entityType === 'invoice')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const invoices = await this.getInvoicesFromLocal(businessId);
    const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    return Promise.all(operations.map(async (operation) => {
      const resolvedInvoiceId = Number(await getMappedId('invoice', businessId, Number(operation.entityId)));
      const invoice = invoiceMap.get(resolvedInvoiceId) || invoiceMap.get(Number(operation.entityId)) || null;
      return {
        ...operation,
        entityLabel: operation.entityLabel || invoice?.invoice_number || (Number(operation.entityId) < 0 ? buildPendingInvoiceNumberLabel(Number(operation.entityId)) : `Factura #${operation.entityId}`),
      };
    }));
  },

  async getSyncSummary(businessId?: number) {
    return summarizeSyncOperations(await offlineDb.listSyncOperations(businessId));
  },

  async retrySyncOperation(operationId: string) {
    const operation = await offlineDb.getSyncOperation(operationId);
    if (!operation) return;

    await updateSyncOperationWithHistory(
      operationId,
      {
        status: 'pending',
        error: null,
        errorCategory: null,
        errorDetail: null,
        technicalDetail: null,
        conflict: null,
        blockedByOperationId: null,
        blockedByEntityId: null,
        completedAt: null,
      },
      { status: 'pending', message: 'Operación marcada para reintento manual.' }
    );
    if (operation.entityType === 'invoice') {
      await updateLocalInvoiceOperationState(operation, 'pending');
    }
    emitOfflineSyncEvent();
  },

  async retryInvoiceSyncOperations(businessId: number, operationIds?: string[]) {
    const operations = await this.listInvoiceSyncOperations(businessId);
    const retryable = operations.filter((operation) =>
      (!operationIds || operationIds.includes(operation.id))
      && ['failed', 'blocked', 'conflicted'].includes(operation.status)
    );

    for (const operation of retryable) {
      await this.retrySyncOperation(operation.id);
    }
  },

  async dismissSyncOperation(operationId: string) {
    await offlineDb.deleteSyncOperation(operationId);
    emitOfflineSyncEvent();
  },

  async discardInvoicePendingChanges(operationId: string) {
    const operation = await offlineDb.getSyncOperation(operationId);
    if (!operation || operation.entityType !== 'invoice') return;

    const targetInvoiceId = operation.action === 'create' && operation.tempId != null
      ? Number(operation.tempId)
      : Number(await getMappedId('invoice', operation.businessId, Number(operation.entityId)));
    const relatedOperations = (await listInvoiceOperationsForInvoice(operation.businessId, targetInvoiceId))
      .filter((entry) => entry.status !== 'synced');

    if (operation.action === 'create' && Number(operation.entityId) < 0) {
      await deleteSyncOperationsByIds(relatedOperations.map((entry) => entry.id));
      await offlineDb.deleteEntity('invoices', operation.businessId, Number(operation.entityId));
      emitOfflineSyncEvent();
      return;
    }

    if (!navigator.onLine) {
      throw new Error('Necesitas conexión para restaurar la versión del servidor y descartar cambios locales.');
    }

    await deleteSyncOperationsByIds(relatedOperations.map((entry) => entry.id));
    await restoreInvoiceFromServer(operation.businessId, targetInvoiceId);
    emitOfflineSyncEvent();
  },

  async getPendingCount(businessId?: number) {
    if (!this.isEnabled()) return 0;
    return offlineDb.countPendingSyncOperations(businessId);
  },

  async getLastSyncAt(businessId: number) {
    if (!this.isEnabled()) return null;
    return offlineDb.getMetadata<string>(`${LAST_SYNC_KEY_PREFIX}${businessId}`);
  },

  async syncPendingOperations(businessId?: number) {
    if (!this.isEnabled() || !navigator.onLine) {
      return { synced: 0, failed: 0, lastError: null as string | null };
    }

    const operations = await offlineDb.listPendingSyncOperations(businessId);
    let synced = 0;
    let failed = 0;
    let lastError: string | null = null;

    for (const operation of operations) {
      try {
        if (operation.entityType === 'invoice' && !isBackendCapabilitySupported('invoices')) {
          const unsupportedMessage = 'Facturas no está disponible en el backend actual; la operación offline no se puede sincronizar.';
          await updateSyncOperationWithHistory(
            operation.id,
            {
              status: 'failed',
              error: unsupportedMessage,
              errorCategory: 'business_rule_rejected',
              errorDetail: unsupportedMessage,
              technicalDetail: unsupportedMessage,
              completedAt: null,
            },
            { status: 'failed', message: unsupportedMessage, category: 'business_rule_rejected' }
          );
          await updateLocalInvoiceOperationState(operation, 'failed');
          failed += 1;
          lastError = unsupportedMessage;
          continue;
        }

        await updateSyncOperationWithHistory(
          operation.id,
          {
            status: 'syncing',
            error: null,
            errorCategory: null,
            errorDetail: null,
            technicalDetail: null,
            conflict: null,
            blockedByOperationId: null,
            blockedByEntityId: null,
            lastAttemptAt: new Date().toISOString(),
            retryCount: Number(operation.retryCount || 0) + 1,
          },
          { status: 'syncing', message: 'Sincronizando operación…' }
        );
        emitOfflineSyncEvent();

        const resolvedPayload = await resolveOperationPayloadReferences(operation);
        const resolvedEndpoint = await resolveOperationEndpoint(operation);
        const localInvoiceBeforeSync = operation.entityType === 'invoice'
          ? await getLocalInvoiceRecordForOperation(operation)
          : null;

        const method = operation.action === 'create'
          || operation.action === 'status_update'
          || operation.action === 'payment_create'
          ? 'POST'
          : operation.action === 'update'
            ? 'PUT'
            : 'DELETE';

        const response = await authorizedJsonRequest<Record<string, any>>(resolvedEndpoint, {
          method,
          body: operation.action === 'delete'
            ? {
              client_operation_id: operation.clientOperationId,
            }
            : {
            ...resolvedPayload,
            client_operation_id: operation.clientOperationId,
          },
        });

        const entityKey = getResponseEntityKey(operation.entityType);
        const storeName = getStoreNameForEntity(operation.entityType);
        const entity = response?.[entityKey];

        if (operation.action === 'delete') {
          await offlineDb.deleteEntity(storeName, operation.businessId, operation.entityId);
        } else if (operation.entityType === 'invoice' && entity?.id != null) {
          const remainingOperations = await listPendingOperationsForEntity(
            operation.businessId,
            'invoice',
            operation.tempId != null ? operation.tempId : Number(operation.entityId)
          );
          const serverInvoice = normalizeInvoice(entity as Invoice);
          const nextInvoice = operation.action === 'payment_create'
            ? mergeLocalInvoicePayments(serverInvoice, localInvoiceBeforeSync, {
                excludeClientOperationId: operation.clientOperationId,
                pendingOperations: remainingOperations,
              })
            : remainingOperations.length > 0 && localInvoiceBeforeSync
              ? withInvoiceRecordSyncStatus(
                  normalizeInvoice({
                    ...localInvoiceBeforeSync,
                    id: Number(serverInvoice.id),
                    business_id: serverInvoice.business_id,
                    customer_id: serverInvoice.customer_id,
                    customer_name: serverInvoice.customer_name,
                    customer_phone: serverInvoice.customer_phone,
                    customer_address: serverInvoice.customer_address,
                    invoice_number: serverInvoice.invoice_number || localInvoiceBeforeSync.invoice_number,
                    created_at: serverInvoice.created_at || localInvoiceBeforeSync.created_at,
                    updated_at: serverInvoice.updated_at || localInvoiceBeforeSync.updated_at,
                    created_by: serverInvoice.created_by ?? localInvoiceBeforeSync.created_by,
                    created_by_name: serverInvoice.created_by_name || localInvoiceBeforeSync.created_by_name,
                  }),
                  remainingOperations
                )
              : mergeLocalInvoicePayments(serverInvoice, localInvoiceBeforeSync, {
                  pendingOperations: remainingOperations,
                });

          if (operation.tempId != null && operation.action === 'create') {
            await storeTempIdMapping(operation.entityType, operation.businessId, operation.tempId, Number(entity.id));
            await offlineDb.deleteEntity(storeName, operation.businessId, operation.tempId);
          }
          await offlineDb.upsertEntity(storeName, operation.businessId, Number(entity.id), {
            ...nextInvoice,
            client_operation_id: operation.clientOperationId,
          });
        } else if (entity?.id != null) {
          if (operation.tempId != null) {
            await storeTempIdMapping(operation.entityType, operation.businessId, operation.tempId, Number(entity.id));
            await offlineDb.deleteEntity(storeName, operation.businessId, operation.tempId);
          }
          await offlineDb.upsertEntity(storeName, operation.businessId, Number(entity.id), {
            ...entity,
            sync_status: 'synced',
            is_offline_record: false,
            offline_deleted: false,
            client_operation_id: operation.clientOperationId,
          });
        }

        await updateSyncOperationWithHistory(
          operation.id,
          {
            status: 'synced',
            error: null,
            errorCategory: null,
            errorDetail: null,
            technicalDetail: null,
            conflict: null,
            blockedByOperationId: null,
            blockedByEntityId: null,
            completedAt: new Date().toISOString(),
          },
          { status: 'synced', message: 'Sincronización completada correctamente.' }
        );
        await updateLastSyncAt(operation.businessId, new Date().toISOString());
        synced += 1;
      } catch (error: any) {
        failed += 1;
        const normalizedError = normalizeSyncError(operation, error);
        lastError = normalizedError.message;

        await updateSyncOperationWithHistory(
          operation.id,
          {
            status: normalizedError.status,
            error: normalizedError.message,
            errorCategory: normalizedError.category,
            errorDetail: normalizedError.message,
            technicalDetail: normalizedError.technicalDetail || null,
            conflict: normalizedError.conflict || null,
            blockedByOperationId: normalizedError.blockedByOperationId || null,
            blockedByEntityId: normalizedError.blockedByEntityId || null,
          },
          {
            status: normalizedError.status,
            message: normalizedError.message,
            category: normalizedError.category,
          }
        );
        await updateLocalInvoiceOperationState(operation, normalizedError.status);

        emitOfflineSyncEvent();

        if (normalizedError.category === 'network_unavailable' || normalizedError.category === 'server_unavailable') {
          break;
        }
      }
    }

    const businessIdsToRefresh = Array.from(new Set(operations.map((operation) => operation.businessId)));
    await Promise.all(businessIdsToRefresh.map((id) => this.prepareOfflineSnapshot(id).catch(() => undefined)));
    if (businessIdsToRefresh.length > 0) {
      emitOfflineSnapshotApplied(businessIdsToRefresh);
    }
    emitOfflineSyncEvent();

    return { synced, failed, lastError };
  },
};
