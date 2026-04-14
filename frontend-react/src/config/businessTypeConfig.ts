import type { BusinessType } from '../types';

const BUSINESS_TYPE_STORAGE_KEY = 'encaja:business_type';

export const getStoredBusinessType = (): BusinessType => {
  if (typeof window === 'undefined') return 'retail';
  try {
    const stored = localStorage.getItem(BUSINESS_TYPE_STORAGE_KEY);
    if (stored === 'services' || stored === 'hybrid' || stored === 'retail') return stored;
  } catch { /* noop */ }
  return 'retail';
};

export const setStoredBusinessType = (value: BusinessType) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BUSINESS_TYPE_STORAGE_KEY, value);
};

export const showOrdersModule = (bt: BusinessType) => bt === 'retail' || bt === 'hybrid';
export const showAgendaModule = (bt: BusinessType) => bt === 'services' || bt === 'hybrid';
