import { isOfflineProductMode } from '../runtime/runtimeMode';

export const OFFLINE_FEATURE_STORAGE_KEY = 'encaja:offline:enabled';

export const isOfflineSyncEnabled = () => {
  if (isOfflineProductMode()) {
    return true;
  }

  const envValue = import.meta.env.VITE_ENABLE_OFFLINE_SYNC;

  if (typeof window === 'undefined') {
    return envValue !== 'false';
  }

  const storedValue = window.localStorage.getItem(OFFLINE_FEATURE_STORAGE_KEY);

  if (storedValue === 'true') return true;
  if (storedValue === 'false') return false;

  return envValue !== 'false';
};
