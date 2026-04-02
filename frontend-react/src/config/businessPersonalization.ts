import { Business, BusinessModuleKey, isBusinessModuleEnabled } from '../types';
import type { BusinessOperationalModel } from './businessOperationalProfile';

export type BusinessTypeKey = 'simple_store' | 'services' | 'production' | 'wholesale';
export type BusinessCommercialSectionKey = 'invoices' | 'orders' | 'sales_goals';
export type BusinessCommercialSectionsState = Record<BusinessCommercialSectionKey, boolean>;
export type BusinessOnboardingBusinessCategory = 'products' | 'services' | 'mixed' | 'production';
export type BusinessOnboardingInventoryMode = 'yes' | 'basic' | 'no';
export type BusinessOnboardingSalesFlow = 'immediate' | 'pending' | 'orders' | 'quotes_invoices';
export type BusinessOnboardingHomeFocus = 'cash' | 'sales' | 'collections' | 'products' | 'summary';
export type BusinessOnboardingTeamMode = 'solo' | 'small_team' | 'roles';
export type BusinessOnboardingDocumentsMode = 'formal' | 'simple_receipts' | 'none';
export type BusinessOnboardingOperationsMode = 'none' | 'resale' | 'production' | 'suppliers';
export type BusinessOnboardingRawMaterialsMode = 'yes' | 'no';
export type BusinessOnboardingRecipeMode = 'fixed' | 'variable' | 'none';
export type BusinessOnboardingSellingMode = 'stock' | 'by_order' | 'both';
export type BusinessOnboardingProductionControl = 'yes' | 'later' | 'no';
export type BusinessOnboardingGuidanceMode = 'express' | 'guided' | 'companion';
export type BusinessOnboardingTeamStructure = 'solo_owner' | 'small_operations_team' | 'sales_and_admin' | 'multi_area_team';
export type BusinessOnboardingRoleSetup = 'owner_only' | 'shared_roles' | 'specific_roles';
export type BusinessOnboardingPermissionControl = 'simple' | 'by_area' | 'by_person';
export type BusinessOnboardingOwnerFocus = 'cash_and_sales' | 'team_followup' | 'approvals_and_control' | 'profitability_and_growth';

export const DEFAULT_BUSINESS_COMMERCIAL_SECTIONS: BusinessCommercialSectionsState = {
  invoices: true,
  orders: true,
  sales_goals: true,
};

export interface BusinessPersonalizationAnswers {
  sellsFixedPriceProducts: boolean | null;
  needsQuotes: boolean | null;
  managesRawMaterials: boolean | null;
  buysFromSuppliersOnCredit: boolean | null;
  needsProfitability: boolean | null;
  businessModel: BusinessTypeKey | null;
  operationalModel: BusinessOperationalModel | null;
  businessCategory: BusinessOnboardingBusinessCategory | null;
  inventoryMode: BusinessOnboardingInventoryMode | null;
  salesFlow: BusinessOnboardingSalesFlow | null;
  homeFocus: BusinessOnboardingHomeFocus | null;
  teamMode: BusinessOnboardingTeamMode | null;
  documentsMode: BusinessOnboardingDocumentsMode | null;
  operationsMode: BusinessOnboardingOperationsMode | null;
  rawMaterialsMode: BusinessOnboardingRawMaterialsMode | null;
  recipeMode: BusinessOnboardingRecipeMode | null;
  sellingMode: BusinessOnboardingSellingMode | null;
  productionControl: BusinessOnboardingProductionControl | null;
  guidanceMode: BusinessOnboardingGuidanceMode | null;
  teamStructure: BusinessOnboardingTeamStructure | null;
  roleSetup: BusinessOnboardingRoleSetup | null;
  permissionControl: BusinessOnboardingPermissionControl | null;
  ownerFocus: BusinessOnboardingOwnerFocus | null;
}

export interface BusinessInitialSetupProfile {
  business_category: BusinessOnboardingBusinessCategory | null;
  inventory_mode: BusinessOnboardingInventoryMode | null;
  sales_flow: BusinessOnboardingSalesFlow | null;
  home_focus: BusinessOnboardingHomeFocus | null;
  team_mode: BusinessOnboardingTeamMode | null;
  documents_mode: BusinessOnboardingDocumentsMode | null;
  operations_mode: BusinessOnboardingOperationsMode | null;
  operational_model: BusinessOperationalModel | null;
  raw_materials_mode: BusinessOnboardingRawMaterialsMode | null;
  recipe_mode: BusinessOnboardingRecipeMode | null;
  selling_mode: BusinessOnboardingSellingMode | null;
  production_control: BusinessOnboardingProductionControl | null;
  guidance_mode?: BusinessOnboardingGuidanceMode | null;
  team_structure?: BusinessOnboardingTeamStructure | null;
  role_setup?: BusinessOnboardingRoleSetup | null;
  permission_control?: BusinessOnboardingPermissionControl | null;
  owner_focus?: BusinessOnboardingOwnerFocus | null;
}

export interface BusinessInitialSetupSettings {
  version: number;
  onboarding_profile: BusinessInitialSetupProfile;
  onboarding_completed: boolean;
  onboarding_completed_at?: string | null;
  initial_modules_applied: BusinessModuleKey[];
  initial_home_focus?: string | null;
  initial_dashboard_tab?: 'hoy' | 'balance' | 'analiticas' | 'recordatorios' | null;
  recommended_tutorials: string[];
  simplicity_level: 'simple' | 'guided' | 'advanced';
  highlighted_tools: string[];
  hidden_tools: string[];
}

export interface BusinessPersonalizationOnboarding {
  completed: boolean;
  skipped: boolean;
  last_updated_at?: string | null;
  answers: BusinessPersonalizationAnswers;
  suggested_business_type?: BusinessTypeKey | null;
  suggested_modules?: BusinessModuleKey[];
  applied_modules_once?: boolean;
}

export interface BusinessNavigationDefaults {
  business_type?: BusinessTypeKey | null;
  favorite_paths: string[];
  hidden_paths: string[];
  prioritized_path?: string | null;
  last_applied_at?: string | null;
}

export interface BusinessPersonalizationSettings {
  business_type?: BusinessTypeKey | null;
  visibility_mode?: 'basic' | 'advanced' | null;
  navigation_defaults?: BusinessNavigationDefaults | null;
  commercial_sections: BusinessCommercialSectionsState;
  onboarding: BusinessPersonalizationOnboarding;
}

export type BusinessBaseSource = 'explicit' | 'suggested' | 'inferred';

export interface BusinessBaseState {
  source: BusinessBaseSource;
  effectiveBusinessType: BusinessTypeKey;
  explicitBusinessType: BusinessTypeKey | null;
  suggestedBusinessType: BusinessTypeKey | null;
  inferredBusinessType: BusinessTypeKey;
  needsReview: boolean;
}

export interface BusinessTypePreset {
  key: BusinessTypeKey;
  label: string;
  shortDescription: string;
  longDescription: string;
  recommendedModules: BusinessModuleKey[];
  coveredExperiences: string[];
  recommendedMenuPaths: string[];
}

export interface BusinessTypeRecommendation {
  businessType: BusinessTypeKey;
  suggestedModules: BusinessModuleKey[];
  reasons: string[];
}

export const DEFAULT_PERSONALIZATION_ANSWERS: BusinessPersonalizationAnswers = {
  sellsFixedPriceProducts: null,
  needsQuotes: null,
  managesRawMaterials: null,
  buysFromSuppliersOnCredit: null,
  needsProfitability: null,
  businessModel: null,
  operationalModel: null,
  businessCategory: null,
  inventoryMode: null,
  salesFlow: null,
  homeFocus: null,
  teamMode: null,
  documentsMode: null,
  operationsMode: null,
  rawMaterialsMode: null,
  recipeMode: null,
  sellingMode: null,
  productionControl: null,
  guidanceMode: null,
  teamStructure: null,
  roleSetup: null,
  permissionControl: null,
  ownerFocus: null,
};

export const DEFAULT_BUSINESS_INITIAL_SETUP: BusinessInitialSetupSettings = {
  version: 1,
  onboarding_profile: {
    business_category: null,
    inventory_mode: null,
    sales_flow: null,
    home_focus: null,
    team_mode: null,
    documents_mode: null,
    operations_mode: null,
    operational_model: null,
    raw_materials_mode: null,
    recipe_mode: null,
    selling_mode: null,
    production_control: null,
    guidance_mode: null,
    team_structure: null,
    role_setup: null,
    permission_control: null,
    owner_focus: null,
  },
  onboarding_completed: false,
  onboarding_completed_at: null,
  initial_modules_applied: [],
  initial_home_focus: null,
  initial_dashboard_tab: 'hoy',
  recommended_tutorials: [],
  simplicity_level: 'guided',
  highlighted_tools: [],
  hidden_tools: [],
};

export const DEFAULT_PERSONALIZATION_SETTINGS: BusinessPersonalizationSettings = {
  business_type: null,
  visibility_mode: null,
  navigation_defaults: null,
  commercial_sections: DEFAULT_BUSINESS_COMMERCIAL_SECTIONS,
  onboarding: {
    completed: false,
    skipped: false,
    last_updated_at: null,
    answers: DEFAULT_PERSONALIZATION_ANSWERS,
    suggested_business_type: null,
    suggested_modules: [],
    applied_modules_once: false,
  },
};

export const BUSINESS_TYPE_PRESETS: Record<BusinessTypeKey, BusinessTypePreset> = {
  simple_store: {
    key: 'simple_store',
    label: 'Tienda simple',
    shortDescription: 'Para negocios que venden rápido y quieren ver solo lo esencial.',
    longDescription: 'Prioriza registrar ventas, llevar gastos del día, controlar clientes frecuentes, manejar productos y consultar reportes sin saturar la navegación.',
    recommendedModules: ['sales', 'customers', 'products', 'reports'],
    coveredExperiences: ['Ventas', 'Gastos', 'Clientes', 'Productos', 'Alertas y reportes'],
    recommendedMenuPaths: ['/dashboard', '/sales', '/expenses', '/products', '/customers', '/alerts', '/reports'],
  },
  services: {
    key: 'services',
    label: 'Encargos o servicios',
    shortDescription: 'Para negocios que cotizan, convierten propuestas y cobran después.',
    longDescription: 'Da prioridad al flujo comercial desde la cotización hasta el cobro, sin perder de vista los gastos operativos del negocio.',
    recommendedModules: ['sales', 'customers', 'accounts_receivable', 'quotes', 'reports'],
    coveredExperiences: ['Cotizaciones', 'Ventas', 'Gastos', 'Clientes', 'Cartera', 'Alertas y reportes'],
    recommendedMenuPaths: ['/dashboard', '/quotes', '/sales', '/expenses', '/payments', '/customers', '/alerts', '/reports'],
  },
  production: {
    key: 'production',
    label: 'Producción, restaurante o repostería',
    shortDescription: 'Para negocios que trabajan con insumos, recetas y control de costos.',
    longDescription: 'Activa el flujo de bodega para materias primas, compras, gastos operativos, recetas y calculadora de costos, sin crear módulos nuevos.',
    recommendedModules: ['sales', 'products', 'raw_inventory', 'reports'],
    coveredExperiences: ['Inventario bodega', 'Compras y proveedores', 'Gastos operativos', 'Recetas', 'Calculadora de costos', 'Rentabilidad'],
    recommendedMenuPaths: ['/dashboard', '/sales', '/raw-inventory', '/raw-purchases', '/expenses', '/recipes', '/cost-calculator', '/alerts', '/reports'],
  },
  wholesale: {
    key: 'wholesale',
    label: 'Mayorista o distribuidor',
    shortDescription: 'Para negocios con catálogo amplio, clientes recurrentes y cartera activa.',
    longDescription: 'Enfoca la navegación en ventas, cartera, gastos recurrentes y reportes, dejando bodega avanzada solo si realmente la necesitas.',
    recommendedModules: ['sales', 'customers', 'products', 'accounts_receivable', 'reports'],
    coveredExperiences: ['Ventas', 'Clientes', 'Cobros', 'Gastos', 'Productos', 'Rentabilidad y reportes'],
    recommendedMenuPaths: ['/dashboard', '/sales', '/customers', '/payments', '/expenses', '/products', '/alerts', '/reports'],
  },
};

const uniqueModules = (modules: BusinessModuleKey[]) => Array.from(new Set(modules));

export const getBusinessTypePreset = (businessType?: BusinessTypeKey | null) => {
  if (!businessType) return null;
  return BUSINESS_TYPE_PRESETS[businessType] || null;
};

export const inferBusinessTypeFromBusiness = (business?: Business | null): BusinessTypeKey => {
  if (isBusinessModuleEnabled(business?.modules, 'raw_inventory')) return 'production';
  if (isBusinessModuleEnabled(business?.modules, 'quotes')) return 'services';
  if (isBusinessModuleEnabled(business?.modules, 'accounts_receivable')) return 'wholesale';
  return 'simple_store';
};

const uniquePaths = (paths?: string[]) => Array.from(new Set((paths || []).filter(Boolean)));

export const getBusinessBaseState = (source?: Business | Record<string, any> | null): BusinessBaseState => {
  const personalization = getBusinessPersonalizationSettings(source);
  const explicitBusinessType = personalization.business_type || null;
  const suggestedBusinessType = personalization.onboarding.suggested_business_type || null;
  const inferredBusinessType =
    'settings' in (source || {}) || 'modules' in (source || {})
      ? inferBusinessTypeFromBusiness(source as Business)
      : 'simple_store';

  if (explicitBusinessType) {
    return {
      source: 'explicit',
      effectiveBusinessType: explicitBusinessType,
      explicitBusinessType,
      suggestedBusinessType,
      inferredBusinessType,
      needsReview: false,
    };
  }

  if (suggestedBusinessType) {
    return {
      source: 'suggested',
      effectiveBusinessType: suggestedBusinessType,
      explicitBusinessType,
      suggestedBusinessType,
      inferredBusinessType,
      needsReview: true,
    };
  }

  return {
    source: 'inferred',
    effectiveBusinessType: inferredBusinessType,
    explicitBusinessType,
    suggestedBusinessType,
    inferredBusinessType,
    needsReview: true,
  };
};

export const resolveBusinessType = (source?: Business | Record<string, any> | null): BusinessTypeKey => {
  return getBusinessBaseState(source).effectiveBusinessType;
};

export const getRecommendedModulesForBusinessType = (businessType?: BusinessTypeKey | null) => {
  const preset = getBusinessTypePreset(businessType);
  return preset ? preset.recommendedModules : [];
};

const readPersonalizationPayload = (source?: Business | Record<string, any> | null) => {
  if (!source) return null;
  if ('settings' in source) {
    return (source.settings as Record<string, any> | null | undefined)?.personalization || null;
  }
  return (source as Record<string, any>).personalization || source;
};

const readInitialSetupPayload = (source?: Business | Record<string, any> | null) => {
  if (!source) return null;
  if ('settings' in source) {
    return (source.settings as Record<string, any> | null | undefined)?.initial_setup || null;
  }
  return (source as Record<string, any>).initial_setup || source;
};

export const getBusinessPersonalizationSettings = (source?: Business | Record<string, any> | null): BusinessPersonalizationSettings => {
  const personalization = readPersonalizationPayload(source) as Partial<BusinessPersonalizationSettings> | null;
  const onboarding = (personalization?.onboarding || {}) as Partial<BusinessPersonalizationOnboarding>;
  const answers = (onboarding.answers || {}) as Partial<BusinessPersonalizationAnswers>;
  const commercialSections = (personalization?.commercial_sections || {}) as Partial<BusinessCommercialSectionsState>;

  return {
    business_type: personalization?.business_type || null,
    visibility_mode: personalization?.visibility_mode || null,
    navigation_defaults: personalization?.navigation_defaults
      ? {
          business_type: personalization.navigation_defaults.business_type || null,
          favorite_paths: uniquePaths(personalization.navigation_defaults.favorite_paths),
          hidden_paths: uniquePaths(personalization.navigation_defaults.hidden_paths),
          prioritized_path: personalization.navigation_defaults.prioritized_path || null,
          last_applied_at: personalization.navigation_defaults.last_applied_at || null,
        }
      : null,
    commercial_sections: {
      ...DEFAULT_BUSINESS_COMMERCIAL_SECTIONS,
      ...Object.fromEntries(
        Object.entries(commercialSections).map(([key, value]) => [key, !!value])
      ),
    } as BusinessCommercialSectionsState,
    onboarding: {
      completed: !!onboarding.completed,
      skipped: !!onboarding.skipped,
      last_updated_at: onboarding.last_updated_at || null,
      answers: {
        ...DEFAULT_PERSONALIZATION_ANSWERS,
        ...answers,
      },
      suggested_business_type: onboarding.suggested_business_type || null,
      suggested_modules: uniqueModules((onboarding.suggested_modules || []) as BusinessModuleKey[]),
      applied_modules_once: !!onboarding.applied_modules_once,
    },
  };
};

export const getBusinessInitialSetup = (
  source?: Business | Record<string, any> | null
): BusinessInitialSetupSettings => {
  const initialSetup = (readInitialSetupPayload(source) || {}) as Partial<BusinessInitialSetupSettings>;
  const profile = (initialSetup.onboarding_profile || {}) as Partial<BusinessInitialSetupProfile>;

  return {
    version: Number(initialSetup.version || DEFAULT_BUSINESS_INITIAL_SETUP.version),
    onboarding_profile: {
      ...DEFAULT_BUSINESS_INITIAL_SETUP.onboarding_profile,
      ...profile,
    },
    onboarding_completed: !!initialSetup.onboarding_completed,
    onboarding_completed_at: initialSetup.onboarding_completed_at || null,
    initial_modules_applied: uniqueModules((initialSetup.initial_modules_applied || []) as BusinessModuleKey[]),
    initial_home_focus: initialSetup.initial_home_focus || null,
    initial_dashboard_tab:
      initialSetup.initial_dashboard_tab || DEFAULT_BUSINESS_INITIAL_SETUP.initial_dashboard_tab,
    recommended_tutorials: uniquePaths(initialSetup.recommended_tutorials),
    simplicity_level: initialSetup.simplicity_level || DEFAULT_BUSINESS_INITIAL_SETUP.simplicity_level,
    highlighted_tools: uniquePaths(initialSetup.highlighted_tools),
    hidden_tools: uniquePaths(initialSetup.hidden_tools),
  };
};

export const buildPersonalizationSettingsPatch = (
  currentSettings: Record<string, any> | null | undefined,
  personalization: BusinessPersonalizationSettings
) => {
  return {
    ...(currentSettings || {}),
    personalization,
  };
};

export const getBusinessNavigationDefaults = (
  source?: Business | Record<string, any> | null
): BusinessNavigationDefaults | null => {
  return getBusinessPersonalizationSettings(source).navigation_defaults || null;
};

export const getBusinessCommercialSections = (
  source?: Business | Record<string, any> | null
): BusinessCommercialSectionsState => {
  return getBusinessPersonalizationSettings(source).commercial_sections;
};

export const isBusinessCommercialSectionEnabled = (
  source: Business | Record<string, any> | null | undefined,
  sectionKey: BusinessCommercialSectionKey
) => {
  return !!getBusinessCommercialSections(source)[sectionKey];
};

export const hasExplicitBusinessBase = (source?: Business | Record<string, any> | null) => {
  return getBusinessBaseState(source).source === 'explicit';
};

export const getOnboardingProgress = (answers: BusinessPersonalizationAnswers) => {
  const total = 17;
  const answered = [
    answers.operationalModel,
    answers.businessCategory,
    answers.inventoryMode,
    answers.salesFlow,
    answers.homeFocus,
    answers.teamMode,
    answers.documentsMode,
    answers.operationsMode,
    answers.rawMaterialsMode,
    answers.recipeMode,
    answers.sellingMode,
    answers.productionControl,
    answers.guidanceMode,
    answers.teamStructure,
    answers.roleSetup,
    answers.permissionControl,
    answers.ownerFocus,
  ].filter((value) => value !== null).length;

  return {
    answered,
    total,
    percentage: Math.round((answered / total) * 100),
  };
};

export const suggestBusinessTypeFromAnswers = (answers: BusinessPersonalizationAnswers): BusinessTypeRecommendation => {
  if (answers.operationalModel === 'production_fixed_stock' || answers.operationalModel === 'production_make_to_order') {
    return {
      businessType: 'production',
      suggestedModules: uniqueModules(['sales', 'products', 'raw_inventory', 'reports']),
      reasons: ['Tu operación depende de producción, materias primas y una lógica de cumplimiento más operativa.'],
    };
  }

  if (answers.operationalModel === 'service_no_stock') {
    return {
      businessType: 'services',
      suggestedModules: uniqueModules(['sales', 'customers', 'quotes', 'reports']),
      reasons: ['Tu operación no depende de inventario ni materias primas, sino del flujo comercial y de servicio.'],
    };
  }

  if (answers.operationalModel === 'resale_fixed_stock') {
    return {
      businessType: 'simple_store',
      suggestedModules: uniqueModules(['sales', 'customers', 'products', 'reports']),
      reasons: ['Tu operación parte de producto terminado en stock listo para revender.'],
    };
  }

  if (answers.businessCategory === 'production' || answers.operationsMode === 'production') {
    return {
      businessType: 'production',
      suggestedModules: uniqueModules(['sales', 'products', 'raw_inventory', 'reports']),
      reasons: ['Necesitas una base pensada para insumos, control operativo y produccion.'],
    };
  }

  if (answers.businessCategory === 'services') {
    return {
      businessType: 'services',
      suggestedModules: uniqueModules(['sales', 'customers', 'quotes', 'reports']),
      reasons: ['Tu negocio depende mas del flujo comercial y de propuestas que del inventario.'],
    };
  }

  if (answers.businessCategory === 'mixed') {
    return {
      businessType: 'wholesale',
      suggestedModules: uniqueModules(['sales', 'customers', 'products', 'accounts_receivable', 'reports']),
      reasons: ['Combinas productos y servicios, asi que te conviene una configuracion equilibrada.'],
    };
  }

  const scores: Record<BusinessTypeKey, number> = {
    simple_store: 0,
    services: 0,
    production: 0,
    wholesale: 0,
  };

  if (answers.businessModel) {
    scores[answers.businessModel] += 5;
  }

  if (answers.sellsFixedPriceProducts === true) {
    scores.simple_store += 2;
    scores.production += 1;
    scores.wholesale += 2;
  }

  if (answers.needsQuotes === true) {
    scores.services += 3;
    scores.wholesale += 1;
  }

  if (answers.managesRawMaterials === true) {
    scores.production += 4;
    scores.wholesale += 1;
  }

  if (answers.buysFromSuppliersOnCredit === true) {
    scores.production += 2;
    scores.wholesale += 2;
  }

  if (answers.needsProfitability === true) {
    scores.production += 2;
    scores.wholesale += 2;
    scores.services += 1;
  }

  if (answers.sellsFixedPriceProducts === false) {
    scores.services += 1;
  }

  const businessType = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'simple_store') as BusinessTypeKey;
  const suggestedModules = [...getRecommendedModulesForBusinessType(businessType)];

  if (answers.sellsFixedPriceProducts === true) {
    suggestedModules.push('sales', 'products');
  }

  if (answers.needsQuotes === true) {
    suggestedModules.push('quotes');
  }

  if (answers.managesRawMaterials === true || answers.buysFromSuppliersOnCredit === true) {
    suggestedModules.push('raw_inventory');
  }

  if (answers.needsProfitability === true) {
    suggestedModules.push('reports');
  }

  if (businessType !== 'production') {
    suggestedModules.push('customers');
  }

  const reasons: string[] = [];
  if (answers.businessModel) reasons.push(`Elegiste un negocio tipo ${BUSINESS_TYPE_PRESETS[answers.businessModel].label.toLowerCase()}.`);
  if (answers.needsQuotes) reasons.push('Necesitas cotizar antes de vender.');
  if (answers.managesRawMaterials) reasons.push('Trabajas con materias primas o insumos.');
  if (answers.buysFromSuppliersOnCredit) reasons.push('Necesitas seguir compras y pagos a proveedores.');
  if (answers.needsProfitability) reasons.push('Quieres revisar costos, márgenes y alertas de rentabilidad.');
  if (reasons.length === 0) reasons.push('Tomé una configuración inicial simple para no mostrar más secciones de las necesarias.');

  return {
    businessType,
    suggestedModules: uniqueModules(suggestedModules),
    reasons,
  };
};

export const getMissingRecommendedModules = (
  currentModules: BusinessModuleKey[],
  recommendedModules: BusinessModuleKey[]
) => recommendedModules.filter((moduleKey) => !currentModules.includes(moduleKey));

export const getEnabledBusinessModules = (business?: Business | null): BusinessModuleKey[] => {
  if (!business) return [];
  return (['sales', 'customers', 'products', 'accounts_receivable', 'reports', 'quotes', 'raw_inventory'] as BusinessModuleKey[]).filter((moduleKey) =>
    isBusinessModuleEnabled(business.modules, moduleKey)
  );
};

export const getMissingBusinessProfileFields = (business?: Business | null) => {
  if (!business) return [];
  const settings = business.settings || {};
  const missing: string[] = [];

  if (!business.name?.trim()) missing.push('nombre del negocio');
  if (!String(settings.city || '').trim()) missing.push('ciudad');
  if (!String(settings.phone || '').trim()) missing.push('teléfono');
  if (!String(settings.address || '').trim()) missing.push('dirección');

  return missing;
};

export const hasCompletedPersonalization = (business?: Business | null) => {
  return getBusinessPersonalizationSettings(business).onboarding.completed;
};
