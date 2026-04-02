import { User } from '../types';

export type Plan = 'free' | 'basic' | 'pro' | 'business';

export const PLANS = {
  BASIC: 'basic',
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
} as const;

export const PLAN_ORDER: Array<'basic' | 'pro' | 'business'> = ['basic', 'pro', 'business'];

export const normalizePlan = (plan?: string | null): 'basic' | 'pro' | 'business' => {
  if (!plan || plan === 'free' || plan === 'basic') return 'basic';
  if (plan === 'business') return 'business';
  return 'pro';
};

export const isPlanAtLeast = (plan: string | null | undefined, minimumPlan: 'basic' | 'pro' | 'business'): boolean => {
  return PLAN_ORDER.indexOf(normalizePlan(plan)) >= PLAN_ORDER.indexOf(minimumPlan);
};

export const MODULE_MINIMUM_PLAN = {
  sales: 'basic',
  customers: 'basic',
  products: 'basic',
  reports: 'basic',
  accounts_receivable: 'pro',
  quotes: 'pro',
  raw_inventory: 'pro',
} as const;

export const canAccessModule = (plan: string | null | undefined, moduleKey: keyof typeof MODULE_MINIMUM_PLAN): boolean => {
  return isPlanAtLeast(plan, MODULE_MINIMUM_PLAN[moduleKey]);
};

export const FEATURES = {
  MULTI_BUSINESS: 'multi_business',
  DASHBOARD_ANALYTICS: 'dashboard_analytics',
  DASHBOARD_REMINDERS: 'dashboard_reminders',
  ORDERS: 'orders',
  RECURRING_EXPENSES: 'recurring_expenses',
  REPORTS: 'reports',
  ALERTS: 'alerts',
  DEBTS: 'debts',
  WHATSAPP_TEMPLATES: 'whatsapp_templates',
  LIMIT_CUSTOMERS: 'limit_customers',
  LIMIT_PRODUCTS: 'limit_products',
  LIMIT_SALES: 'limit_sales',
  LIMIT_EXPENSES: 'limit_expenses',
  // Business Only Features
  MULTI_BARCODE: 'multi_barcode',
  ADVANCED_INVENTORY: 'advanced_inventory',
  INVENTORY_HISTORY: 'inventory_history',
  STOCK_ALERTS: 'stock_alerts',
  BULK_IMPORT: 'bulk_import',
  TEAM_MANAGEMENT: 'team_management',
  AUDIT_TRAIL: 'audit_trail',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export const BUSINESS_ONLY_FEATURES: FeatureKey[] = [
  FEATURES.MULTI_BARCODE,
  FEATURES.ADVANCED_INVENTORY,
  FEATURES.INVENTORY_HISTORY,
  FEATURES.STOCK_ALERTS,
  FEATURES.BULK_IMPORT,
  FEATURES.TEAM_MANAGEMENT,
  FEATURES.AUDIT_TRAIL,
];

export const canAccessFeatureInPlan = (
  feature: FeatureKey,
  plan: string | null | undefined
): boolean => {
  const effectivePlan = normalizePlan(plan);
  const isBusiness = effectivePlan === 'business';
  const isPro = effectivePlan === 'pro' || isBusiness;

  if (isBusiness) return true;

  if (BUSINESS_ONLY_FEATURES.includes(feature)) {
    return false;
  }

  if (isPro) return true;

  switch (feature) {
    case FEATURES.MULTI_BUSINESS:
    case FEATURES.DASHBOARD_ANALYTICS:
    case FEATURES.DASHBOARD_REMINDERS:
    case FEATURES.ORDERS:
    case FEATURES.RECURRING_EXPENSES:
    case FEATURES.REPORTS:
    case FEATURES.ALERTS:
    case FEATURES.DEBTS:
    case FEATURES.WHATSAPP_TEMPLATES:
      return false;
    default:
      return true;
  }
};

export const FREE_LIMITS = {
  CUSTOMERS: 10,
  PRODUCTS: 5,
  SALES: 30,
  EXPENSES: 30,
};

export const hasPro = (user: User | null): boolean => {
  if (!user) return false;
  const plan = normalizePlan(user.plan);
  return plan === 'pro' || plan === 'business';
};

export const hasBusiness = (user: User | null): boolean => {
  if (!user) return false;
  return normalizePlan(user.plan) === 'business';
};

export const canAccess = (feature: FeatureKey, user: User | null, planOverride?: string): boolean => {
  if (!user) return false;
  return canAccessFeatureInPlan(feature, planOverride || user.plan);
};

export const getPlanName = (plan: Plan): string => {
  switch (normalizePlan(plan)) {
    case 'basic': return 'Básica';
    case 'pro': return 'Pro';
    case 'business': return 'Business';
  }
};
