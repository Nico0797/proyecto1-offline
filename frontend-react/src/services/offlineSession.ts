import type { ActiveContext, AccessibleContext, Business, User } from '../types';
import { isOfflineSyncEnabled } from '../config/offline';
import { offlineSyncService } from './offlineSyncService';
import { pushBootTrace } from '../debug/bootTrace';

const ACTIVE_BUSINESS_STORAGE_KEY = 'activeBusiness';
const USER_STORAGE_KEY = 'user';
const ACTIVE_CONTEXT_STORAGE_KEY = 'activeContext';
const ACCESSIBLE_CONTEXTS_STORAGE_KEY = 'accessibleContexts';

export const normalizeOfflineBusinessRecord = (value: unknown): Business | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Partial<Business> & Record<string, unknown>;
  const id = Number(record.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const userId = Number(record.user_id);
  const normalizedModules = Array.isArray(record.modules)
    ? record.modules.filter((module): module is NonNullable<Business['modules']>[number] => Boolean(module && typeof module === 'object' && 'module_key' in module))
    : undefined;
  const normalizedPlan = record.plan === 'free' || record.plan === 'basic' || record.plan === 'pro' || record.plan === 'business'
    ? record.plan
    : 'business';

  return {
    id,
    user_id: Number.isFinite(userId) && userId > 0 ? userId : id,
    name: String(record.name || `Negocio ${id}`),
    currency: String(record.currency || 'COP'),
    created_at: typeof record.created_at === 'string' && record.created_at ? record.created_at : new Date(0).toISOString(),
    settings: record.settings && typeof record.settings === 'object' ? record.settings as Record<string, any> : null,
    whatsapp_templates: record.whatsapp_templates && typeof record.whatsapp_templates === 'object' ? record.whatsapp_templates as Business['whatsapp_templates'] : undefined,
    credit_days: typeof record.credit_days === 'number' ? record.credit_days : undefined,
    role: typeof record.role === 'string' ? record.role : 'owner',
    permissions: Array.isArray(record.permissions) ? record.permissions.filter((permission): permission is string => typeof permission === 'string') : [],
    permissions_canonical: Array.isArray(record.permissions_canonical) ? record.permissions_canonical.filter((permission): permission is string => typeof permission === 'string') : [],
    plan: normalizedPlan,
    modules: normalizedModules,
    rbac: record.rbac && typeof record.rbac === 'object' ? record.rbac as Business['rbac'] : undefined,
    sync_status: record.sync_status === 'pending' || record.sync_status === 'failed' || record.sync_status === 'synced' ? record.sync_status : undefined,
    is_offline_record: Boolean(record.is_offline_record),
    client_operation_id: typeof record.client_operation_id === 'string' ? record.client_operation_id : undefined,
  };
};

const readStoredActiveBusiness = (): Business | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
    return raw ? normalizeOfflineBusinessRecord(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const buildOfflineUser = (business: Business | null | undefined): User | null => {
  if (!business) return null;

  return {
    id: Number(business.user_id || business.id || 1),
    email: 'offline@local.encaja',
    name: business.name || 'Modo offline',
    plan: business.plan || 'business',
    membership_plan: business.plan || 'business',
    account_type: 'personal',
    is_admin: false,
    permissions: { offline_access: true },
  };
};

export const buildDesktopOfflineUser = (): User => ({
  id: 1,
  email: 'desktop@local.encaja',
  name: 'EnCaja Desktop',
  plan: 'business',
  membership_plan: 'business',
  account_type: 'personal',
  is_admin: false,
  permissions: { offline_access: true },
});

export const buildOfflineActiveContext = (business: Business | null | undefined): ActiveContext | null => {
  if (!business) return null;

  return {
    business_id: business.id,
    name: business.name,
    role: business.role || 'owner',
    type: 'offline',
    permissions: [
      ...(business.permissions || []),
      ...(business.permissions_canonical || []),
    ],
  };
};

export const buildOfflineAccessibleContexts = (businesses: Business[]): AccessibleContext[] =>
  businesses.map((business) => ({
    business_id: business.id,
    business_name: business.name,
    role: business.role || 'owner',
    role_id: null,
    context_type: 'owned',
    plan: business.plan || 'business',
    status: 'active',
  }));

export const hasOfflineSessionSeed = () =>
  isOfflineSyncEnabled() && Boolean(readStoredActiveBusiness());

const buildStoredOfflineSnapshot = () => {
  const business = readStoredActiveBusiness();
  const businesses = business ? [business] : [];

  return {
    user: buildOfflineUser(business),
    activeContext: buildOfflineActiveContext(business),
    accessibleContexts: buildOfflineAccessibleContexts(businesses),
    businesses,
    activeBusiness: business,
  };
};

export const getOfflineSessionSeed = () => {
  return buildStoredOfflineSnapshot();
};

export const persistOfflineSessionSnapshot = ({
  businesses,
  activeBusiness,
}: {
  businesses: Business[];
  activeBusiness: Business | null;
}) => {
  if (typeof window === 'undefined') return;

  const user = buildOfflineUser(activeBusiness);
  const activeContext = buildOfflineActiveContext(activeBusiness);
  const accessibleContexts = buildOfflineAccessibleContexts(businesses);

  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
  window.localStorage.setItem(ACCESSIBLE_CONTEXTS_STORAGE_KEY, JSON.stringify(accessibleContexts));

  if (activeBusiness) {
    window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, JSON.stringify(activeBusiness));
  } else {
    window.localStorage.removeItem(ACTIVE_BUSINESS_STORAGE_KEY);
  }

  if (activeContext) {
    window.localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, JSON.stringify(activeContext));
  } else {
    window.localStorage.removeItem(ACTIVE_CONTEXT_STORAGE_KEY);
  }
};

export const restoreOfflineSession = async (preferredBusinessId?: number | null) => {
  pushBootTrace('offlineSession.restore.start', {
    preferredBusinessId: preferredBusinessId ?? null,
  });
  if (!isOfflineSyncEnabled()) {
    pushBootTrace('offlineSession.restore.disabled', {});
    return null;
  }

  const localBusinesses = (await offlineSyncService.getBusinessesFromLocal())
    .map((business) => normalizeOfflineBusinessRecord(business))
    .filter((business): business is Business => Boolean(business));
  const storedActiveBusiness = readStoredActiveBusiness();
  const preferredBusiness = preferredBusinessId != null
    ? localBusinesses.find((business) => business.id === preferredBusinessId) ?? null
    : null;
  const activeBusiness = preferredBusiness
    ?? (storedActiveBusiness
      ? localBusinesses.find((business) => business.id === storedActiveBusiness.id) ?? storedActiveBusiness
      : null)
    ?? localBusinesses[0]
    ?? null;

  if (!activeBusiness) {
    pushBootTrace('offlineSession.restore.empty', {
      localBusinessesCount: localBusinesses.length,
      storedActiveBusinessId: storedActiveBusiness?.id ?? null,
    });
    return null;
  }

  const businesses = localBusinesses.length > 0 ? localBusinesses : [activeBusiness];

  const snapshot = {
    user: buildOfflineUser(activeBusiness),
    activeContext: buildOfflineActiveContext(activeBusiness),
    accessibleContexts: buildOfflineAccessibleContexts(businesses),
    businesses,
    activeBusiness,
  };

  pushBootTrace('offlineSession.restore.resolved', {
    businessesCount: businesses.length,
    activeBusinessId: activeBusiness.id,
    activeContextBusinessId: snapshot.activeContext?.business_id ?? null,
  });

  return snapshot;
};

export const restoreOfflineSessionSafely = async (
  preferredBusinessId?: number | null,
  timeoutMs = 2500,
) => {
  const fallbackSnapshot = buildStoredOfflineSnapshot();
  pushBootTrace('offlineSession.restoreSafely.start', {
    preferredBusinessId: preferredBusinessId ?? null,
    timeoutMs,
    fallbackActiveBusinessId: fallbackSnapshot.activeBusiness?.id ?? null,
  });

  try {
    const result = await Promise.race([
      restoreOfflineSession(preferredBusinessId),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);

    const resolvedSnapshot = result ?? fallbackSnapshot;
    pushBootTrace('offlineSession.restoreSafely.resolved', {
      source: result ? 'restore' : 'fallback',
      activeBusinessId: resolvedSnapshot?.activeBusiness?.id ?? null,
      hasSnapshot: Boolean(resolvedSnapshot?.activeBusiness),
    });
    return resolvedSnapshot?.activeBusiness ? resolvedSnapshot : null;
  } catch {
    pushBootTrace('offlineSession.restoreSafely.errorFallback', {
      activeBusinessId: fallbackSnapshot.activeBusiness?.id ?? null,
    });
    return fallbackSnapshot.activeBusiness ? fallbackSnapshot : null;
  }
};
