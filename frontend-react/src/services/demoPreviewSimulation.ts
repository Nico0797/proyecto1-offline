import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

type PreviewCollectionKey =
  | 'customers'
  | 'products'
  | 'sales'
  | 'payments'
  | 'expenses'
  | 'reminders'
  | 'quotes'
  | 'orders'
  | 'suppliers'
  | 'invoices';

type ResourceConfig = {
  collectionKey: PreviewCollectionKey;
  singularKey: string;
};

type PreviewCollectionState = {
  upserts: Map<number, Record<string, any>>;
  deletedIds: Set<number>;
};

type BusinessOverlayState = {
  patch?: Record<string, any>;
  modules?: Array<Record<string, any>>;
  invoiceSettings?: Record<string, any>;
};

type MatchedCollectionRoute = {
  businessId: number;
  config: ResourceConfig;
  entityId?: number;
};

const RESOURCE_CONFIGS: Record<string, ResourceConfig> = {
  customers: { collectionKey: 'customers', singularKey: 'customer' },
  products: { collectionKey: 'products', singularKey: 'product' },
  sales: { collectionKey: 'sales', singularKey: 'sale' },
  payments: { collectionKey: 'payments', singularKey: 'payment' },
  expenses: { collectionKey: 'expenses', singularKey: 'expense' },
  reminders: { collectionKey: 'reminders', singularKey: 'reminder' },
  quotes: { collectionKey: 'quotes', singularKey: 'quote' },
  orders: { collectionKey: 'orders', singularKey: 'order' },
  suppliers: { collectionKey: 'suppliers', singularKey: 'supplier' },
  invoices: { collectionKey: 'invoices', singularKey: 'invoice' },
};

const collectionOverlays = new Map<string, PreviewCollectionState>();
const businessOverlays = new Map<number, BusinessOverlayState>();
let nextTempId = -1;

const nowIso = () => new Date().toISOString();

const normalizeUrlPath = (url?: string) => {
  const raw = String(url || '');
  if (!raw) return '/';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const parseRequestData = (rawData: unknown) => {
  if (rawData == null) return {};
  if (typeof rawData === 'string') {
    try {
      return JSON.parse(rawData);
    } catch {
      return {};
    }
  }
  if (typeof rawData === 'object') return rawData as Record<string, any>;
  return {};
};

const buildCollectionScopeKey = (businessId: number, resourceKey: PreviewCollectionKey) =>
  `${businessId}:${resourceKey}`;

const getCollectionState = (businessId: number, resourceKey: PreviewCollectionKey) => {
  const scopeKey = buildCollectionScopeKey(businessId, resourceKey);
  const existing = collectionOverlays.get(scopeKey);
  if (existing) return existing;
  const created: PreviewCollectionState = {
    upserts: new Map<number, Record<string, any>>(),
    deletedIds: new Set<number>(),
  };
  collectionOverlays.set(scopeKey, created);
  return created;
};

const getBusinessOverlayState = (businessId: number) => {
  const existing = businessOverlays.get(businessId);
  if (existing) return existing;
  const created: BusinessOverlayState = {};
  businessOverlays.set(businessId, created);
  return created;
};

const readStoredActiveBusiness = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('activeBusiness');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const matchCollectionRoute = (path: string): MatchedCollectionRoute | null => {
  const cleanPath = path.split('?')[0];
  const match = cleanPath.match(/^\/businesses\/(\d+)\/([a-z-]+)(?:\/(-?\d+))?$/i);
  if (!match) return null;
  const businessId = Number(match[1]);
  const resourceSegment = String(match[2] || '').toLowerCase();
  const config = RESOURCE_CONFIGS[resourceSegment];
  if (!config) return null;
  return {
    businessId,
    config,
    entityId: match[3] != null ? Number(match[3]) : undefined,
  };
};

const mergeCollectionWithOverlay = (
  items: Record<string, any>[],
  businessId: number,
  resourceKey: PreviewCollectionKey
) => {
  const state = getCollectionState(businessId, resourceKey);
  const baseItems = Array.isArray(items) ? items : [];
  const merged = new Map<number, Record<string, any>>();

  for (const item of baseItems) {
    const id = Number(item?.id);
    if (!Number.isFinite(id) || state.deletedIds.has(id)) continue;
    const overlay = state.upserts.get(id);
    merged.set(id, overlay ? { ...item, ...overlay } : item);
  }

  for (const [id, overlay] of Array.from(state.upserts.entries())) {
    if (state.deletedIds.has(id)) continue;
    if (!merged.has(id)) {
      merged.set(id, overlay);
    }
  }

  return Array.from(merged.values()).sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
};

const mergeBusinessObject = (business: Record<string, any> | null | undefined) => {
  if (!business || typeof business !== 'object') return business;
  const businessId = Number(business.id);
  if (!Number.isFinite(businessId)) return business;

  const overlay = businessOverlays.get(businessId);
  if (!overlay) return business;

  return {
    ...business,
    ...(overlay.patch || {}),
    modules: overlay.modules || business.modules,
    invoice_settings: overlay.invoiceSettings || business.invoice_settings,
    settings: overlay.patch?.settings || business.settings,
  };
};

const buildSimulatedEntity = (
  config: ResourceConfig,
  businessId: number,
  payload: Record<string, any>,
  entityId?: number
) => {
  const id = entityId ?? nextTempId--;
  const timestamp = nowIso();
  const baseEntity = {
    id,
    business_id: businessId,
    created_at: payload.created_at || timestamp,
    updated_at: timestamp,
    ...payload,
  };

  if (config.collectionKey === 'customers') {
    return {
      active: true,
      total_balance: 0,
      ...baseEntity,
    };
  }

  if (config.collectionKey === 'products') {
    return {
      active: true,
      stock: payload.stock ?? 0,
      unit: payload.unit ?? 'und',
      ...baseEntity,
    };
  }

  if (config.collectionKey === 'sales') {
    return {
      items: payload.items || [],
      subtotal: payload.subtotal ?? 0,
      discount: payload.discount ?? 0,
      total: payload.total ?? payload.subtotal ?? 0,
      balance: payload.balance ?? 0,
      collected_amount: payload.collected_amount ?? payload.total ?? payload.subtotal ?? 0,
      payment_method: payload.payment_method ?? 'cash',
      paid: payload.paid ?? true,
      sale_date: payload.sale_date || timestamp.slice(0, 10),
      ...baseEntity,
    };
  }

  if (config.collectionKey === 'payments') {
    return {
      payment_date: payload.payment_date || timestamp.slice(0, 10),
      method: payload.method || payload.payment_method || 'cash',
      ...baseEntity,
    };
  }

  return baseEntity;
};

const buildSimulatedResponse = (
  config: InternalAxiosRequestConfig,
  data: Record<string, any>,
  status = 200
): AxiosResponse => ({
  data,
  status,
  statusText: 'OK',
  headers: config.headers || {},
  config,
});

export const resetDemoPreviewSimulation = () => {
  collectionOverlays.clear();
  businessOverlays.clear();
  nextTempId = -1;
};

export const isDemoPreviewSensitiveAction = (path: string, method: string) => {
  const normalizedMethod = method.toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(normalizedMethod)) return false;

  return [
    /^\/admin\//,
    /^\/auth\//,
    /^\/billing\/(?!checkout|confirm-wompi|portal)/,
    /^\/membership\//,
    /^\/businesses\/\d+\/team\//,
    /^\/businesses\/\d+\/logo$/,
    /\/import\b/,
    /\/sync\b/,
    /\/feedback\b/,
    /\/invite\b/,
    /\/save-payment-source\b/,
    /\/save-googlepay-source\b/,
    /\/save-nequi-source\b/,
    /\/update-payment-method\b/,
    /\/change-cycle\b/,
    /\/convert-to-sale\b/,
    /\/duplicate\b/,
    /\/consume\b/,
    /\/confirm\b/,
    /\/mark-paid\b/,
    /\/generate-debt\b/,
  ].some((pattern) => pattern.test(path));
};

export const canSimulateDemoPreviewRequest = (path: string, method: string) => {
  const normalizedMethod = method.toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(normalizedMethod)) return false;
  if (matchCollectionRoute(path)) return true;
  if (/^\/businesses\/\d+$/.test(path) && ['put', 'patch'].includes(normalizedMethod)) return true;
  if (/^\/businesses\/\d+\/modules$/.test(path) && ['put', 'patch'].includes(normalizedMethod)) return true;
  if (/^\/businesses\/\d+\/invoice-settings$/.test(path) && ['put', 'patch'].includes(normalizedMethod)) return true;
  return false;
};

export const buildDemoPreviewSimulationResponse = (
  requestConfig: InternalAxiosRequestConfig
): AxiosResponse => {
  const path = normalizeUrlPath(requestConfig.url);
  const method = String(requestConfig.method || 'get').toLowerCase();
  const payload = parseRequestData(requestConfig.data);
  const matchedCollection = matchCollectionRoute(path);

  if (matchedCollection) {
    const { businessId, config, entityId } = matchedCollection;
    const state = getCollectionState(businessId, config.collectionKey);

    if (method === 'post') {
      const entity = buildSimulatedEntity(config, businessId, payload);
      state.deletedIds.delete(Number(entity.id));
      state.upserts.set(Number(entity.id), entity);
      return buildSimulatedResponse(requestConfig, {
        [config.singularKey]: entity,
        preview: true,
        message: 'Vista previa interactiva: el cambio es temporal y no se guardó en la base real.',
      }, 200);
    }

    if ((method === 'put' || method === 'patch') && entityId != null) {
      const current = state.upserts.get(entityId) || { id: entityId, business_id: businessId };
      const entity = buildSimulatedEntity(config, businessId, { ...current, ...payload }, entityId);
      state.deletedIds.delete(entityId);
      state.upserts.set(entityId, entity);
      return buildSimulatedResponse(requestConfig, {
        [config.singularKey]: entity,
        preview: true,
        message: 'Vista previa interactiva: el cambio es temporal y no se guardó en la base real.',
      }, 200);
    }

    if (method === 'delete' && entityId != null) {
      state.upserts.delete(entityId);
      state.deletedIds.add(entityId);
      return buildSimulatedResponse(requestConfig, {
        ok: true,
        preview: true,
        message: 'Vista previa interactiva: el cambio es temporal y no se guardó en la base real.',
      }, 200);
    }
  }

  if (/^\/businesses\/\d+$/.test(path) && (method === 'put' || method === 'patch')) {
    const businessId = Number(path.match(/^\/businesses\/(\d+)$/)?.[1]);
    const overlay = getBusinessOverlayState(businessId);
    const currentBusiness = readStoredActiveBusiness();
    overlay.patch = {
      ...(overlay.patch || {}),
      ...payload,
      settings: payload.settings ? { ...(overlay.patch?.settings || currentBusiness?.settings || {}), ...payload.settings } : (overlay.patch?.settings || currentBusiness?.settings),
    };
    const business = mergeBusinessObject({
      ...(currentBusiness || { id: businessId }),
      ...(overlay.patch || {}),
    });
    return buildSimulatedResponse(requestConfig, { business }, 200);
  }

  if (/^\/businesses\/\d+\/modules$/.test(path) && (method === 'put' || method === 'patch')) {
    const businessId = Number(path.match(/^\/businesses\/(\d+)\/modules$/)?.[1]);
    const overlay = getBusinessOverlayState(businessId);
    const currentBusiness = readStoredActiveBusiness();
    const existingModules = Array.isArray(currentBusiness?.modules) ? currentBusiness.modules : [];
    const incomingModules = payload.modules || {};
    overlay.modules = existingModules.map((module: Record<string, any>) => ({
      ...module,
      enabled: Object.prototype.hasOwnProperty.call(incomingModules, module.module_key)
        ? Boolean(incomingModules[module.module_key])
        : Boolean(module.enabled),
    }));
    return buildSimulatedResponse(requestConfig, { modules: overlay.modules }, 200);
  }

  if (/^\/businesses\/\d+\/invoice-settings$/.test(path) && (method === 'put' || method === 'patch')) {
    const businessId = Number(path.match(/^\/businesses\/(\d+)\/invoice-settings$/)?.[1]);
    const overlay = getBusinessOverlayState(businessId);
    overlay.invoiceSettings = {
      ...(overlay.invoiceSettings || {}),
      ...payload,
      updated_at: nowIso(),
    };
    return buildSimulatedResponse(requestConfig, { settings: overlay.invoiceSettings }, 200);
  }

  return buildSimulatedResponse(
    requestConfig,
    {
      ok: true,
      preview: true,
      message: 'Vista previa interactiva: el cambio es temporal y no se guardó en la base real.',
    },
    200
  );
};

export const applyDemoPreviewOverlayToResponse = (path: string, data: any) => {
  const normalizedPath = normalizeUrlPath(path);

  if (/^\/businesses\/\d+$/.test(normalizedPath) && data?.business) {
    return { ...data, business: mergeBusinessObject(clone(data.business)) };
  }

  if (normalizedPath === '/businesses' && Array.isArray(data?.businesses)) {
    return {
      ...data,
      businesses: data.businesses.map((business: Record<string, any>) => mergeBusinessObject(clone(business))),
    };
  }

  if (normalizedPath === '/auth/bootstrap') {
    return {
      ...data,
      businesses: Array.isArray(data?.businesses)
        ? data.businesses.map((business: Record<string, any>) => mergeBusinessObject(clone(business)))
        : data?.businesses,
      active_business: mergeBusinessObject(clone(data?.active_business)),
    };
  }

  if (/^\/businesses\/\d+\/modules$/.test(normalizedPath) && Array.isArray(data?.modules)) {
    const businessId = Number(normalizedPath.match(/^\/businesses\/(\d+)\/modules$/)?.[1]);
    const overlay = businessOverlays.get(businessId);
    if (!overlay?.modules) return data;
    return { ...data, modules: clone(overlay.modules) };
  }

  if (/^\/businesses\/\d+\/invoice-settings$/.test(normalizedPath) && data?.settings) {
    const businessId = Number(normalizedPath.match(/^\/businesses\/(\d+)\/invoice-settings$/)?.[1]);
    const overlay = businessOverlays.get(businessId);
    if (!overlay?.invoiceSettings) return data;
    return { ...data, settings: { ...clone(data.settings), ...clone(overlay.invoiceSettings) } };
  }

  const matchedCollection = matchCollectionRoute(normalizedPath);
  if (!matchedCollection) return data;

  const { businessId, config, entityId } = matchedCollection;
  if (entityId == null && Array.isArray(data?.[config.collectionKey])) {
    return {
      ...data,
      [config.collectionKey]: mergeCollectionWithOverlay(data[config.collectionKey], businessId, config.collectionKey),
    };
  }

  if (entityId != null && data?.[config.singularKey]) {
    const state = getCollectionState(businessId, config.collectionKey);
    if (state.deletedIds.has(entityId)) {
      return data;
    }
    const overlay = state.upserts.get(entityId);
    if (!overlay) return data;
    return {
      ...data,
      [config.singularKey]: {
        ...clone(data[config.singularKey]),
        ...clone(overlay),
      },
    };
  }

  if (entityId != null && !data?.[config.singularKey]) {
    const overlay = getCollectionState(businessId, config.collectionKey).upserts.get(entityId);
    if (!overlay) return data;
    return {
      ...data,
      [config.singularKey]: clone(overlay),
    };
  }

  return data;
};
