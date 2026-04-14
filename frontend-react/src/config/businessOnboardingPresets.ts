import type { Business, BusinessModuleKey, BusinessType } from '../types';
import { isBusinessModuleEnabled } from '../types';
import { setStoredBusinessType } from './businessTypeConfig';
import type { BusinessCommercialSectionsState, BusinessNavigationDefaults } from './businessPersonalizationCompat';
import { getBusinessCommercialSections, getBusinessNavigationDefaults, getBusinessPersonalizationSettings } from './businessPersonalizationCompat';
import type { BusinessTypeKey } from './businessPresets';
import { BUSINESS_PRESET_UI_ORDER, getBusinessPreset } from './businessPresets';

export type OnboardingSellsAnswer = 'products' | 'services' | 'both';
export type OnboardingWorkflowAnswer = 'orders' | 'appointments' | 'both';
export type OnboardingTeamAnswer = 'solo' | 'team';

export type BusinessVisibilityCategory = 'operations' | 'finance' | 'catalogs';
export type BusinessVisibilityKind = 'module' | 'path' | 'commercial';
export type BusinessVisibilityId =
  | 'sales'
  | 'customers'
  | 'products'
  | 'orders'
  | 'agenda'
  | 'expenses'
  | 'treasury'
  | 'invoices'
  | 'reports';

export interface OnboardingAnswers {
  sells: OnboardingSellsAnswer;
  workflow: OnboardingWorkflowAnswer;
  team: OnboardingTeamAnswer;
  visibleModules: BusinessVisibilityId[];
  granularPresetKey?: BusinessTypeKey | null;
}

export interface BusinessVisibilityOption {
  id: BusinessVisibilityId;
  label: string;
  description: string;
  category: BusinessVisibilityCategory;
  kind: BusinessVisibilityKind;
  path?: string;
  moduleKey?: BusinessModuleKey;
  commercialSectionKey?: keyof BusinessCommercialSectionsState;
}

export interface BusinessTypePresetRules {
  businessType: BusinessType;
  label: string;
  description: string;
  showOrders: boolean;
  showAgenda: boolean;
  usesEmployees: boolean;
  usesServicesCatalog: boolean;
  defaultVisibleModules: BusinessVisibilityId[];
  recommendedShortcuts: string[];
  granularPresetKey: BusinessTypeKey;
  enabledBusinessModules: BusinessModuleKey[];
  commercialSections: BusinessCommercialSectionsState;
}

export interface UnifiedBusinessPreset {
  businessType: BusinessType;
  granularPresetKey: BusinessTypeKey;
  granularPreset: NonNullable<ReturnType<typeof getBusinessPreset>>;
  rules: BusinessTypePresetRules;
  visibleModules: BusinessVisibilityId[];
  enabledBusinessModules: BusinessModuleKey[];
  commercialSections: BusinessCommercialSectionsState;
  recommendedShortcuts: string[];
  showOrders: boolean;
  showAgenda: boolean;
  usesEmployees: boolean;
  usesServicesCatalog: boolean;
}

export interface GranularBusinessPresetChoice {
  key: BusinessTypeKey;
  title: string;
  description: string;
  shortDescription: string;
  operationalBusinessType: BusinessType;
}

export const BUSINESS_VISIBILITY_OPTIONS: BusinessVisibilityOption[] = [
  {
    id: 'sales',
    label: 'Ventas',
    description: 'Registrar ventas y seguimiento comercial.',
    category: 'operations',
    kind: 'module',
    path: '/sales',
    moduleKey: 'sales',
  },
  {
    id: 'customers',
    label: 'Clientes',
    description: 'Ver clientes, historial y seguimiento.',
    category: 'operations',
    kind: 'module',
    path: '/customers',
    moduleKey: 'customers',
  },
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Gestionar pedidos y compromisos activos.',
    category: 'operations',
    kind: 'commercial',
    path: '/orders',
    commercialSectionKey: 'orders',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    description: 'Citas, servicios y atencion programada.',
    category: 'operations',
    kind: 'path',
    path: '/agenda',
  },
  {
    id: 'expenses',
    label: 'Gastos',
    description: 'Controlar egresos y movimientos del dia.',
    category: 'finance',
    kind: 'path',
    path: '/expenses',
  },
  {
    id: 'treasury',
    label: 'Caja / Tesoreria',
    description: 'Ver caja, bancos y movimientos reales.',
    category: 'finance',
    kind: 'path',
    path: '/treasury',
  },
  {
    id: 'invoices',
    label: 'Facturas',
    description: 'Facturacion y seguimiento documental.',
    category: 'finance',
    kind: 'commercial',
    path: '/invoices',
    commercialSectionKey: 'invoices',
  },
  {
    id: 'reports',
    label: 'Reportes',
    description: 'Resumenes, alertas y analisis.',
    category: 'finance',
    kind: 'module',
    path: '/reports',
    moduleKey: 'reports',
  },
  {
    id: 'products',
    label: 'Productos',
    description: 'Catalogo de productos o paquetes.',
    category: 'catalogs',
    kind: 'module',
    path: '/products',
    moduleKey: 'products',
  },
];

export const ONBOARDING_MODULE_OPTIONS = BUSINESS_VISIBILITY_OPTIONS.filter((option) =>
  ['sales', 'customers', 'expenses', 'treasury', 'agenda', 'orders', 'invoices', 'reports'].includes(option.id),
);

export const MODULE_CATEGORIES = [
  {
    id: 'operations' as const,
    title: 'Operacion',
    description: 'Lo esencial para vender y atender.',
  },
  {
    id: 'finance' as const,
    title: 'Finanzas',
    description: 'Cobros, caja, gastos y reportes.',
  },
  {
    id: 'catalogs' as const,
    title: 'Catalogos',
    description: 'Lo que ofreces desde el primer dia.',
  },
] as const;

const DEFAULT_COMMERCIAL_SECTIONS: BusinessCommercialSectionsState = {
  invoices: false,
  orders: false,
  sales_goals: false,
};

const PRESET_RULES: Record<BusinessType, BusinessTypePresetRules> = {
  retail: {
    businessType: 'retail',
    label: 'Productos',
    description: 'Productos, pedidos y flujo comercial rapido.',
    showOrders: true,
    showAgenda: false,
    usesEmployees: false,
    usesServicesCatalog: false,
    defaultVisibleModules: ['sales', 'customers', 'products', 'orders', 'expenses', 'treasury', 'reports'],
    recommendedShortcuts: ['/sales', '/products', '/orders'],
    granularPresetKey: 'inventory_store',
    enabledBusinessModules: ['sales', 'customers', 'products', 'reports'],
    commercialSections: {
      ...DEFAULT_COMMERCIAL_SECTIONS,
      orders: true,
    },
  },
  services: {
    businessType: 'services',
    label: 'Servicios',
    description: 'Agenda, clientes y cobros en una experiencia simple.',
    showOrders: false,
    showAgenda: true,
    usesEmployees: true,
    usesServicesCatalog: true,
    defaultVisibleModules: ['sales', 'customers', 'agenda', 'expenses', 'treasury', 'invoices', 'reports'],
    recommendedShortcuts: ['/agenda', '/sales', '/customers'],
    granularPresetKey: 'services',
    enabledBusinessModules: ['sales', 'customers', 'quotes', 'accounts_receivable', 'reports'],
    commercialSections: {
      ...DEFAULT_COMMERCIAL_SECTIONS,
      invoices: true,
    },
  },
  hybrid: {
    businessType: 'hybrid',
    label: 'Ambos',
    description: 'Productos y servicios con pedidos y agenda visibles.',
    showOrders: true,
    showAgenda: true,
    usesEmployees: true,
    usesServicesCatalog: true,
    defaultVisibleModules: ['sales', 'customers', 'products', 'orders', 'agenda', 'expenses', 'treasury', 'invoices', 'reports'],
    recommendedShortcuts: ['/sales', '/agenda', '/products'],
    granularPresetKey: 'general',
    enabledBusinessModules: ['sales', 'customers', 'products', 'quotes', 'accounts_receivable', 'reports'],
    commercialSections: {
      ...DEFAULT_COMMERCIAL_SECTIONS,
      invoices: true,
      orders: true,
    },
  },
};

const uniqueVisibilityIds = (modules: BusinessVisibilityId[]) => Array.from(new Set(modules));

const uniqueModuleKeys = (modules: BusinessModuleKey[]) => Array.from(new Set(modules));

const uniquePaths = (paths: string[]) => Array.from(new Set(paths));

const isBusinessType = (value: unknown): value is BusinessType =>
  value === 'retail' || value === 'services' || value === 'hybrid';

export const getBusinessTypeFromPresetKey = (presetKey?: BusinessTypeKey | null): BusinessType => {
  if (presetKey === 'services' || presetKey === 'beauty') return 'services';
  if (presetKey === 'food_service' || presetKey === 'production' || presetKey === 'general') return 'hybrid';
  return 'retail';
};

const resolveVisibleModulesFromGranularPreset = (presetKey: BusinessTypeKey, businessType: BusinessType): BusinessVisibilityId[] => {
  const preset = getBusinessPreset(presetKey);
  const baseDefaults = PRESET_RULES[businessType].defaultVisibleModules;

  if (!preset) {
    return [...baseDefaults];
  }

  const visible = new Set<BusinessVisibilityId>(baseDefaults);

  BUSINESS_VISIBILITY_OPTIONS.forEach((option) => {
    if (option.path && preset.recommendedMenuPaths.includes(option.path)) {
      visible.add(option.id);
    }

    if (option.moduleKey && preset.recommendedModules.includes(option.moduleKey)) {
      visible.add(option.id);
    }

    if (option.commercialSectionKey && preset.commercialSections?.[option.commercialSectionKey]) {
      visible.add(option.id);
    }
  });

  if (businessType === 'services') {
    visible.delete('orders');
    visible.add('agenda');
  }

  if (businessType === 'retail') {
    visible.delete('agenda');
  }

  if (businessType === 'hybrid') {
    visible.add('agenda');
    if (preset.commercialSections?.orders || preset.recommendedMenuPaths.includes('/orders')) {
      visible.add('orders');
    }
  }

  return Array.from(visible);
};

export const getGranularPresetChoices = (): GranularBusinessPresetChoice[] =>
  BUSINESS_PRESET_UI_ORDER.map((presetKey) => {
    const preset = getBusinessPreset(presetKey);
    if (!preset) {
      throw new Error(`No preset found for '${presetKey}'`);
    }

    return {
      key: preset.key,
      title: preset.name,
      description: preset.shortDescription,
      shortDescription: preset.longDescription,
      operationalBusinessType: getBusinessTypeFromPresetKey(preset.key),
    };
  });

export const getBusinessTypeFromAnswers = (answers: Pick<OnboardingAnswers, 'sells' | 'workflow'>): BusinessType => {
  const { sells, workflow } = answers;

  if (sells === 'services') return 'services';
  if (sells === 'both') return 'hybrid';
  if (workflow === 'appointments' || workflow === 'both') return 'hybrid';
  return 'retail';
};

export const getBusinessPresetRules = (businessType: BusinessType): BusinessTypePresetRules => PRESET_RULES[businessType];

export const getModulesByCategory = (category: BusinessVisibilityCategory) =>
  BUSINESS_VISIBILITY_OPTIONS.filter((option) => option.category === category);

export const getDefaultVisibleModulesForType = (businessType: BusinessType) =>
  [...PRESET_RULES[businessType].defaultVisibleModules];

export const getRecommendedModulesFromAnswers = (answers: OnboardingAnswers): BusinessVisibilityId[] => {
  const preset = getBusinessPresetFromAnswers({ ...answers, visibleModules: answers.visibleModules || [] });
  return preset.visibleModules;
};

export const getBusinessPresetFromType = (
  businessType: BusinessType,
  overrides?: Partial<Pick<OnboardingAnswers, 'team' | 'visibleModules' | 'granularPresetKey'>>,
): UnifiedBusinessPreset => {
  const rules = PRESET_RULES[businessType];
  const resolvedGranularPresetKey = overrides?.granularPresetKey || rules.granularPresetKey;
  const granularPreset = getBusinessPreset(resolvedGranularPresetKey);

  if (!granularPreset) {
    throw new Error(`No preset found for '${resolvedGranularPresetKey}'`);
  }

  const visibleModules = uniqueVisibilityIds(
    overrides?.visibleModules?.length
      ? overrides.visibleModules
      : resolveVisibleModulesFromGranularPreset(resolvedGranularPresetKey, businessType),
  );

  const enabledBusinessModules = uniqueModuleKeys([
    ...granularPreset.recommendedModules,
    ...rules.enabledBusinessModules,
    ...(visibleModules.includes('products') ? (['products'] as BusinessModuleKey[]) : []),
    ...(visibleModules.includes('reports') ? (['reports'] as BusinessModuleKey[]) : []),
  ]);

  const commercialSections: BusinessCommercialSectionsState = {
    ...DEFAULT_COMMERCIAL_SECTIONS,
    ...rules.commercialSections,
    orders: rules.showOrders && visibleModules.includes('orders'),
    invoices: visibleModules.includes('invoices'),
  };

  return {
    businessType,
    granularPresetKey: resolvedGranularPresetKey,
    granularPreset,
    rules,
    visibleModules,
    enabledBusinessModules,
    commercialSections,
    recommendedShortcuts: uniquePaths(
      [...granularPreset.favoritePaths, ...rules.recommendedShortcuts].filter((path) => {
        if (path === '/agenda') return rules.showAgenda && visibleModules.includes('agenda');
        if (path === '/orders') return rules.showOrders && visibleModules.includes('orders');
        if (path === '/products') return visibleModules.includes('products');
        return true;
      }),
    ),
    showOrders: rules.showOrders && visibleModules.includes('orders'),
    showAgenda: rules.showAgenda && visibleModules.includes('agenda'),
    usesEmployees: rules.usesEmployees || overrides?.team === 'team',
    usesServicesCatalog: rules.usesServicesCatalog,
  };
};

export const getBusinessPresetFromAnswers = (answers: OnboardingAnswers): UnifiedBusinessPreset => {
  const businessType = getBusinessTypeFromAnswers(answers);
  const granularPresetKey = answers.granularPresetKey || PRESET_RULES[businessType].granularPresetKey;
  const recommended = resolveVisibleModulesFromGranularPreset(granularPresetKey, businessType);
  const mergedVisibleModules = uniqueVisibilityIds(
    answers.visibleModules?.length ? answers.visibleModules : recommended,
  );
  return getBusinessPresetFromType(businessType, {
    team: answers.team,
    visibleModules: mergedVisibleModules,
    granularPresetKey,
  });
};

export const applyBusinessPreset = (businessType: BusinessType) => {
  setStoredBusinessType(businessType);
  return getBusinessPresetFromType(businessType);
};

export const mapVisibilityToBusinessModules = (visibleModules: BusinessVisibilityId[], businessType: BusinessType) => {
  const basePreset = getBusinessPresetFromType(businessType, { visibleModules });
  return [...basePreset.enabledBusinessModules];
};

export const buildNavigationVisibilityForPreset = (
  businessType: BusinessType,
  visibleModules: BusinessVisibilityId[],
  currentDefaults?: BusinessNavigationDefaults | null,
) => {
  const preset = getBusinessPresetFromType(businessType, { visibleModules });
  const hiddenPaths = new Set(currentDefaults?.hidden_paths || []);

  BUSINESS_VISIBILITY_OPTIONS.forEach((option) => {
    if (!option.path) return;
    const shouldBeVisible = preset.visibleModules.includes(option.id)
      && (option.id !== 'orders' || preset.showOrders)
      && (option.id !== 'agenda' || preset.showAgenda);

    if (shouldBeVisible) {
      hiddenPaths.delete(option.path);
    } else {
      hiddenPaths.add(option.path);
    }
  });

  if (!preset.showAgenda) hiddenPaths.add('/agenda');
  if (!preset.showOrders) hiddenPaths.add('/orders');

  return {
    favorite_paths: preset.recommendedShortcuts,
    hidden_paths: Array.from(hiddenPaths),
  };
};

export const resolveSimpleBusinessTypeFromBusiness = (business?: Business | null): BusinessType => {
  const personalization = getBusinessPersonalizationSettings(business);

  if (isBusinessType(personalization.simple_business_type)) {
    return personalization.simple_business_type;
  }

  const suggestedSimpleType = (personalization.onboarding.answers as unknown as Record<string, unknown> | undefined)?.simpleBusinessType;
  if (isBusinessType(suggestedSimpleType)) {
    return suggestedSimpleType;
  }

  const explicitPreset = personalization.business_type;
  if (explicitPreset) {
    return getBusinessTypeFromPresetKey(explicitPreset);
  }

  if (isBusinessModuleEnabled(business?.modules, 'quotes') || isBusinessModuleEnabled(business?.modules, 'accounts_receivable')) {
    return 'services';
  }

  return 'retail';
};

export const getVisibleModulesFromBusiness = (business?: Business | null): BusinessVisibilityId[] => {
  const businessType = resolveSimpleBusinessTypeFromBusiness(business);
  const personalization = getBusinessPersonalizationSettings(business);
  const granularPresetKey = personalization.business_type || null;
  const defaults = getDefaultVisibleModulesForType(businessType);
  const sections = getBusinessCommercialSections(business);
  const navigationDefaults = getBusinessNavigationDefaults(business);
  const hiddenPaths = new Set(navigationDefaults?.hidden_paths || []);

  const visibility = new Set<BusinessVisibilityId>();

  BUSINESS_VISIBILITY_OPTIONS.forEach((option) => {
    if (option.kind === 'module' && option.moduleKey) {
      if (isBusinessModuleEnabled(business?.modules, option.moduleKey)) {
        visibility.add(option.id);
      }
      return;
    }

    if (option.kind === 'commercial' && option.commercialSectionKey) {
      if (sections[option.commercialSectionKey]) {
        visibility.add(option.id);
      }
      return;
    }

    if (option.path && !hiddenPaths.has(option.path)) {
      visibility.add(option.id);
    }
  });

  if (!hiddenPaths.has('/agenda') && shouldShowAgendaForBusiness(business)) {
    visibility.add('agenda');
  }
  if (!hiddenPaths.has('/orders') && shouldShowOrdersForBusiness(business) && sections.orders) {
    visibility.add('orders');
  }

  const presetDefaults = granularPresetKey
    ? resolveVisibleModulesFromGranularPreset(granularPresetKey, businessType)
    : defaults;

  return uniqueVisibilityIds([...presetDefaults.filter((id) => visibility.has(id)), ...visibility]);
};

export const shouldShowAgendaForBusiness = (business?: Business | null) =>
  resolveSimpleBusinessTypeFromBusiness(business) !== 'retail';

export const shouldShowOrdersForBusiness = (business?: Business | null) =>
  resolveSimpleBusinessTypeFromBusiness(business) !== 'services';

export const getAllPresetRules = (): BusinessTypePresetRules[] =>
  (['retail', 'services', 'hybrid'] as BusinessType[]).map((businessType) => PRESET_RULES[businessType]);
