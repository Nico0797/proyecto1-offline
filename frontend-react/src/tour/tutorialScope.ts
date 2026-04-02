const USER_STORAGE_KEY = 'user';
const ACTIVE_CONTEXT_STORAGE_KEY = 'activeContext';
const ACTIVE_BUSINESS_STORAGE_KEY = 'activeBusiness';

type StoredUser = {
  id?: number | string | null;
  email?: string | null;
};

type StoredActiveContext = {
  business_id?: number | string | null;
};

type StoredBusiness = {
  id?: number | string | null;
};

const parseStorageItem = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const normalizeIdentityValue = (value?: number | string | null, fallback = 'unknown') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

export const buildTutorialScopeKey = (
  userId?: number | string | null,
  businessId?: number | string | null
) => {
  return `${normalizeIdentityValue(userId, 'anon')}:${normalizeIdentityValue(businessId, 'nobusiness')}`;
};

export const getPersistedTutorialScopeKey = () => {
  const user = parseStorageItem<StoredUser>(USER_STORAGE_KEY);
  const activeContext = parseStorageItem<StoredActiveContext>(ACTIVE_CONTEXT_STORAGE_KEY);
  const activeBusiness = parseStorageItem<StoredBusiness>(ACTIVE_BUSINESS_STORAGE_KEY);

  return buildTutorialScopeKey(
    user?.id || user?.email || 'anon',
    activeContext?.business_id ?? activeBusiness?.id ?? 'nobusiness'
  );
};
