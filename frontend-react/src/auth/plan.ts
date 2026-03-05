import { User } from '../types';

export type Plan = 'free' | 'pro';

export const PLANS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

export const FEATURES = {
  MULTI_BUSINESS: 'multi_business',
  DASHBOARD_ANALYTICS: 'dashboard_analytics',
  DASHBOARD_REMINDERS: 'dashboard_reminders',
  ORDERS: 'orders',
  RECURRING_EXPENSES: 'recurring_expenses',
  REPORTS: 'reports',
  ALERTS: 'alerts',
  WHATSAPP_TEMPLATES: 'whatsapp_templates',
  LIMIT_CUSTOMERS: 'limit_customers',
  LIMIT_PRODUCTS: 'limit_products',
  LIMIT_SALES: 'limit_sales',
  LIMIT_EXPENSES: 'limit_expenses',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export const FREE_LIMITS = {
  CUSTOMERS: 10,
  PRODUCTS: 5,
  SALES: 30,
  EXPENSES: 30,
};

export const hasPro = (user: User | null): boolean => {
  if (!user) return false;
  return user.plan === 'pro';
};

export const canAccess = (feature: FeatureKey, user: User | null): boolean => {
  if (!user) return false;
  if (hasPro(user)) return true;

  // Free plan restrictions
  switch (feature) {
    case FEATURES.MULTI_BUSINESS:
      // This is handled separately usually, but essentially false for creating more than 1
      return false;
    case FEATURES.DASHBOARD_ANALYTICS:
    case FEATURES.DASHBOARD_REMINDERS:
    case FEATURES.ORDERS:
    case FEATURES.RECURRING_EXPENSES:
    case FEATURES.REPORTS:
    case FEATURES.ALERTS:
    case FEATURES.WHATSAPP_TEMPLATES:
      return false;
    default:
      return true;
  }
};

export const getPlanName = (plan: Plan): string => {
  return plan === 'pro' ? 'Pro' : 'Gratis';
};
