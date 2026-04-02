export type ModuleTone =
  | 'sales'
  | 'expenses'
  | 'products'
  | 'alerts'
  | 'settings'
  | 'sync'
  | 'neutral';

export const moduleToneClasses: Record<ModuleTone, string> = {
  sales: 'app-module-sales',
  expenses: 'app-module-expenses',
  products: 'app-module-products',
  alerts: 'app-module-alerts',
  settings: 'app-module-settings',
  sync: 'app-module-sync',
  neutral: 'app-module-neutral',
};
