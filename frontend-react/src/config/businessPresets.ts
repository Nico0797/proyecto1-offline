import { Business, BusinessModuleKey } from '../types';
import type { BusinessOperationalModel } from './businessOperationalProfile';

export type BusinessTypeKey =
  | 'simple_store'
  | 'inventory_store'
  | 'food_service'
  | 'services'
  | 'production'
  | 'beauty'
  | 'wholesale'
  | 'general';

export const BUSINESS_PRESET_UI_ORDER: BusinessTypeKey[] = [
  'simple_store',
  'inventory_store',
  'food_service',
  'services',
  'production',
  'beauty',
  'wholesale',
  'general',
];

export interface BusinessPresetDefinition {
  key: BusinessTypeKey;
  name: string;
  shortDescription: string;
  longDescription: string;
  operationalModel: BusinessOperationalModel;
  inventoryModel?: string | null;
  fulfillmentMode?: 'stock' | 'make_to_order' | 'hybrid' | 'service' | null;
  productionMode?: string | null;
  recipeMode?: string | null;
  productionControlMode?: string | null;
  managesRawMaterials: boolean;
  tracksFinishedGoodsStock: boolean;
  usesRawInventory: boolean;
  usesRecipes: boolean;
  controlsProduction: boolean;
  supportsQuotes: boolean;
  supportsMakeToOrder: boolean;
  consumesRawMaterialsOnProduction: boolean;
  consumesRawMaterialsOnSale: boolean;
  consumesRawMaterialsOnQuoteConversion: boolean;
  recommendedModules: BusinessModuleKey[];
  commercialSections: Record<string, boolean>;
  recommendedMenuPaths: string[];
  favoritePaths: string[];
  hiddenPaths: string[];
  prioritizedPath?: string | null;
  suggestedHomeFocus?: string | null;
  suggestedDashboardTab?: string | null;
  simplicityLevel: string;
  recommendedTutorials: string[];
  incompatibleModules: Set<BusinessModuleKey>;
  requiredFeatures: Set<string>;
}

const NONE_REQUIRED = new Set<string>();
const NO_INCOMPATIBLE_MODULES = new Set<BusinessModuleKey>();

export const BUSINESS_PRESETS: Record<BusinessTypeKey, BusinessPresetDefinition> = {
  simple_store: {
    key: 'simple_store',
    name: 'Tienda simple',
    shortDescription: 'Vende rapido con una app limpia y sin menus innecesarios.',
    longDescription: 'Pensado para tiendas pequenas o de mostrador que necesitan cobrar, registrar productos, seguir clientes frecuentes y ver resultados sin una configuracion pesada.',
    operationalModel: 'resale_fixed_stock',
    inventoryModel: 'finished_goods',
    fulfillmentMode: 'stock',
    tracksFinishedGoodsStock: true,
    managesRawMaterials: false,
    usesRawInventory: false,
    usesRecipes: false,
    controlsProduction: false,
    supportsQuotes: false,
    supportsMakeToOrder: false,
    consumesRawMaterialsOnProduction: false,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'products', 'reports'],
    commercialSections: { invoices: false, orders: false, sales_goals: false },
    recommendedMenuPaths: ['/dashboard', '/sales', '/expenses', '/products', '/customers', '/alerts', '/reports'],
    favoritePaths: ['/sales', '/products'],
    hiddenPaths: [],
    prioritizedPath: '/sales',
    suggestedHomeFocus: 'sales',
    suggestedDashboardTab: 'hoy',
    simplicityLevel: 'simple',
    recommendedTutorials: ['first_sale', 'basic_expenses'],
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: NONE_REQUIRED,
  },
  inventory_store: {
    key: 'inventory_store',
    name: 'Tienda con inventario',
    shortDescription: 'Para negocios con mas catalogo, mas stock y pedidos mas frecuentes.',
    longDescription: 'Arranca con una base equilibrada para vender, ordenar productos, revisar pedidos y mantener clientes visibles sin llevarte a una experiencia de produccion.',
    operationalModel: 'resale_fixed_stock',
    inventoryModel: 'finished_goods',
    fulfillmentMode: 'stock',
    tracksFinishedGoodsStock: true,
    managesRawMaterials: false,
    usesRawInventory: false,
    usesRecipes: false,
    controlsProduction: false,
    supportsQuotes: false,
    supportsMakeToOrder: false,
    consumesRawMaterialsOnProduction: false,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'products', 'reports'],
    commercialSections: { invoices: true, orders: true, sales_goals: false },
    recommendedMenuPaths: ['/dashboard', '/products', '/sales', '/orders', '/expenses', '/customers', '/alerts', '/reports'],
    favoritePaths: ['/products', '/sales', '/orders'],
    hiddenPaths: [],
    prioritizedPath: '/products',
    suggestedHomeFocus: 'products',
    suggestedDashboardTab: 'hoy',
    simplicityLevel: 'guided',
    recommendedTutorials: ['products', 'first_sale', 'basic_expenses'],
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: NONE_REQUIRED,
  },
  food_service: {
    key: 'food_service',
    name: 'Comidas o restaurante',
    shortDescription: 'Para ventas preparadas con insumos, recetas y control de costos.',
    longDescription: 'Activa una base clara para vender preparados, controlar insumos, revisar compras y entender costos sin convertir toda la app en un cuestionario tecnico.',
    operationalModel: 'production_fixed_stock',
    inventoryModel: 'mixed',
    fulfillmentMode: 'stock',
    productionMode: 'fixed_stock',
    recipeMode: 'fixed',
    productionControlMode: 'enabled',
    tracksFinishedGoodsStock: true,
    managesRawMaterials: true,
    usesRawInventory: true,
    usesRecipes: true,
    controlsProduction: true,
    supportsQuotes: false,
    supportsMakeToOrder: false,
    consumesRawMaterialsOnProduction: true,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'products', 'raw_inventory', 'reports'],
    commercialSections: { invoices: false, orders: true, sales_goals: false },
    recommendedMenuPaths: ['/dashboard', '/sales', '/orders', '/raw-inventory', '/raw-purchases', '/recipes', '/cost-calculator', '/expenses', '/reports'],
    favoritePaths: ['/sales', '/raw-inventory', '/recipes'],
    hiddenPaths: [],
    prioritizedPath: '/sales',
    suggestedHomeFocus: 'sales',
    suggestedDashboardTab: 'analiticas',
    simplicityLevel: 'guided',
    recommendedTutorials: ['raw_materials', 'recipes', 'cost_calculation'],
    incompatibleModules: NO_INCOMPATIBLE_MODULES,
    requiredFeatures: new Set(['raw_inventory']),
  },
  services: {
    key: 'services',
    name: 'Servicios',
    shortDescription: 'Para negocios que venden por trabajo, agenda, proyecto o encargo.',
    longDescription: 'Te deja una experiencia centrada en cotizar, vender, cobrar y seguir clientes sin mezclarla con inventario o produccion si no lo necesitas.',
    operationalModel: 'service_no_stock',
    inventoryModel: 'none',
    fulfillmentMode: 'service',
    tracksFinishedGoodsStock: false,
    managesRawMaterials: false,
    usesRawInventory: false,
    usesRecipes: false,
    controlsProduction: false,
    supportsQuotes: true,
    supportsMakeToOrder: true,
    consumesRawMaterialsOnProduction: false,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'accounts_receivable', 'quotes', 'reports'],
    commercialSections: { invoices: true, orders: false, sales_goals: false },
    recommendedMenuPaths: ['/dashboard', '/agenda', '/quotes', '/sales', '/expenses', '/payments', '/customers', '/alerts', '/reports'],
    favoritePaths: ['/agenda', '/quotes', '/payments'],
    hiddenPaths: [],
    prioritizedPath: '/agenda',
    suggestedHomeFocus: 'collections',
    suggestedDashboardTab: 'balance',
    simplicityLevel: 'guided',
    recommendedTutorials: ['first_quote', 'quote_to_sale', 'payment_registration'],
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: new Set(['quotes']),
  },
  production: {
    key: 'production',
    name: 'Produccion o fabricacion',
    shortDescription: 'Para negocios que transforman insumos o fabrican por lote o por pedido.',
    longDescription: 'Arranca con clientes, productos, cotizaciones y bodega para que la operacion se sienta completa, pero siga siendo editable desde Personalizacion despues.',
    operationalModel: 'production_make_to_order',
    inventoryModel: 'mixed',
    fulfillmentMode: 'make_to_order',
    productionMode: 'to_order',
    recipeMode: 'fixed',
    productionControlMode: 'enabled',
    tracksFinishedGoodsStock: true,
    managesRawMaterials: true,
    usesRawInventory: true,
    usesRecipes: true,
    controlsProduction: true,
    supportsQuotes: true,
    supportsMakeToOrder: true,
    consumesRawMaterialsOnProduction: true,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: true,
    recommendedModules: ['sales', 'customers', 'products', 'quotes', 'raw_inventory', 'reports'],
    commercialSections: { invoices: true, orders: true, sales_goals: false },
    recommendedMenuPaths: ['/dashboard', '/quotes', '/sales', '/customers', '/raw-inventory', '/raw-purchases', '/recipes', '/cost-calculator', '/expenses', '/reports'],
    favoritePaths: ['/raw-inventory', '/recipes', '/quotes'],
    hiddenPaths: [],
    prioritizedPath: '/raw-inventory',
    suggestedHomeFocus: 'products',
    suggestedDashboardTab: 'analiticas',
    simplicityLevel: 'guided',
    recommendedTutorials: ['raw_materials', 'recipes', 'cost_calculation'],
    incompatibleModules: NO_INCOMPATIBLE_MODULES,
    requiredFeatures: new Set(['raw_inventory']),
  },
  beauty: {
    key: 'beauty',
    name: 'Belleza o estetica',
    shortDescription: 'Para peluquerias, barberias, spas y negocios muy centrados en clientes.',
    longDescription: 'Prioriza ventas, clientes, cobros, gastos y metas sin meter bodega avanzada por defecto. Es una base mas comercial y de seguimiento.',
    operationalModel: 'service_no_stock',
    inventoryModel: 'none',
    fulfillmentMode: 'service',
    tracksFinishedGoodsStock: false,
    managesRawMaterials: false,
    usesRawInventory: false,
    usesRecipes: false,
    controlsProduction: false,
    supportsQuotes: false,
    supportsMakeToOrder: false,
    consumesRawMaterialsOnProduction: false,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'accounts_receivable', 'reports'],
    commercialSections: { invoices: true, orders: false, sales_goals: true },
    recommendedMenuPaths: ['/dashboard', '/agenda', '/sales', '/customers', '/payments', '/expenses', '/sales-goals', '/reports'],
    favoritePaths: ['/agenda', '/sales', '/customers'],
    hiddenPaths: [],
    prioritizedPath: '/agenda',
    suggestedHomeFocus: 'sales',
    suggestedDashboardTab: 'balance',
    simplicityLevel: 'guided',
    recommendedTutorials: ['customer_management', 'payment_registration'],
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: NONE_REQUIRED,
  },
  wholesale: {
    key: 'wholesale',
    name: 'Distribucion o mayorista',
    shortDescription: 'Para negocios con pedidos, clientes recurrentes, facturas y cartera.',
    longDescription: 'Balancea ventas, clientes, productos, pedidos, cobros y metas para que el negocio arranque con una base comercial fuerte y bien pensada.',
    operationalModel: 'resale_fixed_stock',
    inventoryModel: 'finished_goods',
    fulfillmentMode: 'stock',
    tracksFinishedGoodsStock: true,
    managesRawMaterials: false,
    usesRawInventory: false,
    usesRecipes: false,
    controlsProduction: false,
    supportsQuotes: false,
    supportsMakeToOrder: false,
    consumesRawMaterialsOnProduction: false,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'products', 'accounts_receivable', 'reports'],
    commercialSections: { invoices: true, orders: true, sales_goals: true },
    recommendedMenuPaths: ['/dashboard', '/sales', '/orders', '/customers', '/payments', '/expenses', '/products', '/sales-goals', '/reports'],
    favoritePaths: ['/sales', '/orders', '/payments'],
    hiddenPaths: [],
    prioritizedPath: '/customers',
    suggestedHomeFocus: 'collections',
    suggestedDashboardTab: 'balance',
    simplicityLevel: 'guided',
    recommendedTutorials: ['customer_management', 'credit_sales', 'payment_followup'],
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: NONE_REQUIRED,
  },
  general: {
    key: 'general',
    name: 'Otro o general',
    shortDescription: 'Una base equilibrada para empezar rapido y editar despues.',
    longDescription: 'Si tu negocio no encaja perfecto en una categoria, empieza con ventas, clientes, productos y analisis. Luego puedes ajustar modulos y vistas desde Personalizacion.',
    operationalModel: 'resale_fixed_stock',
    inventoryModel: 'finished_goods',
    fulfillmentMode: 'stock',
    tracksFinishedGoodsStock: true,
    managesRawMaterials: false,
    usesRawInventory: false,
    usesRecipes: false,
    controlsProduction: false,
    supportsQuotes: false,
    supportsMakeToOrder: false,
    consumesRawMaterialsOnProduction: false,
    consumesRawMaterialsOnSale: false,
    consumesRawMaterialsOnQuoteConversion: false,
    recommendedModules: ['sales', 'customers', 'products', 'reports'],
    commercialSections: { invoices: true, orders: false, sales_goals: false },
    recommendedMenuPaths: ['/dashboard', '/sales', '/customers', '/products', '/expenses', '/alerts', '/reports'],
    favoritePaths: ['/sales', '/customers'],
    hiddenPaths: [],
    prioritizedPath: '/dashboard',
    suggestedHomeFocus: 'sales',
    suggestedDashboardTab: 'hoy',
    simplicityLevel: 'guided',
    recommendedTutorials: ['first_sale', 'products'],
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: NONE_REQUIRED,
  },
};

export const getBusinessPreset = (businessType: BusinessTypeKey | string | null): BusinessPresetDefinition | null => {
  if (!businessType) return null;
  return BUSINESS_PRESETS[businessType as BusinessTypeKey] || null;
};

export const resolveBusinessPresetFromSettings = (business: Business | Record<string, any> | null): BusinessPresetDefinition => {
  if (!business) return BUSINESS_PRESETS.simple_store;

  const settings = 'settings' in business ? business.settings : business;
  if (!settings || typeof settings !== 'object') return BUSINESS_PRESETS.simple_store;

  const personalization = settings.personalization || {};
  const explicitBusinessType = personalization.business_type;
  if (explicitBusinessType) {
    const explicitPreset = getBusinessPreset(explicitBusinessType);
    if (explicitPreset) return explicitPreset;
  }

  const operationalProfile = settings.operational_profile || {};
  const operationalModel = operationalProfile.operational_model;

  if (operationalModel === 'service_no_stock') {
    return BUSINESS_PRESETS.services;
  }

  if (operationalModel === 'production_fixed_stock') {
    return BUSINESS_PRESETS.food_service;
  }

  if (operationalModel === 'production_make_to_order') {
    return BUSINESS_PRESETS.production;
  }

  const modules = settings.modules || {};
  if (modules.raw_inventory) return BUSINESS_PRESETS.production;
  if (modules.quotes) return BUSINESS_PRESETS.services;
  if (modules.accounts_receivable) return BUSINESS_PRESETS.wholesale;

  return BUSINESS_PRESETS.simple_store;
};

export const buildOperationalProfileFromPreset = (preset: BusinessPresetDefinition) => ({
  version: 1,
  operational_model: preset.operationalModel,
  inventory_model: preset.inventoryModel,
  fulfillment_mode: preset.fulfillmentMode,
  production_mode: preset.productionMode,
  recipe_mode: preset.recipeMode,
  production_control_mode: preset.productionControlMode,
  manages_raw_materials: preset.managesRawMaterials,
  tracks_finished_goods_stock: preset.tracksFinishedGoodsStock,
  uses_raw_inventory: preset.usesRawInventory,
  uses_recipes: preset.usesRecipes,
  controls_production: preset.controlsProduction,
  supports_quotes: preset.supportsQuotes,
  supports_make_to_order: preset.supportsMakeToOrder,
  consumes_raw_materials_on_production: preset.consumesRawMaterialsOnProduction,
  consumes_raw_materials_on_sale: preset.consumesRawMaterialsOnSale,
  consumes_raw_materials_on_quote_conversion: preset.consumesRawMaterialsOnQuoteConversion,
});

export const buildPersonalizationFromPreset = (preset: BusinessPresetDefinition) => ({
  business_type: preset.key,
  visibility_mode: preset.simplicityLevel === 'simple' ? 'basic' : 'advanced',
  navigation_defaults: {
    business_type: preset.key,
    favorite_paths: preset.favoritePaths,
    hidden_paths: preset.hiddenPaths,
    prioritized_path: preset.prioritizedPath,
    last_applied_at: null,
  },
  commercial_sections: preset.commercialSections,
  onboarding: {
    completed: false,
    skipped: false,
    last_updated_at: null,
    answers: {},
    suggested_business_type: preset.key,
    suggested_modules: preset.recommendedModules,
    applied_modules_once: false,
  },
});

export const buildInitialSetupFromPreset = (preset: BusinessPresetDefinition) => ({
  version: 1,
  onboarding_profile: {
    business_category: preset.managesRawMaterials ? 'production' : preset.operationalModel === 'service_no_stock' ? 'services' : 'products',
    inventory_mode: preset.tracksFinishedGoodsStock ? 'yes' : 'no',
    sales_flow: preset.supportsQuotes ? 'quotes_invoices' : preset.commercialSections.orders ? 'orders' : 'immediate',
    home_focus: preset.suggestedHomeFocus || 'sales',
    team_mode: 'solo',
    documents_mode: 'simple_receipts',
    operations_mode: preset.controlsProduction ? 'production' : 'resale',
    operational_model: preset.operationalModel,
    raw_materials_mode: preset.managesRawMaterials ? 'yes' : 'no',
    recipe_mode: preset.recipeMode || 'none',
    selling_mode: preset.supportsMakeToOrder ? 'by_order' : 'stock',
    production_control: preset.productionControlMode ? 'yes' : 'no',
    guidance_mode: preset.simplicityLevel === 'guided' ? 'guided' : 'express',
  },
  onboarding_completed: false,
  onboarding_completed_at: null,
  initial_modules_applied: preset.recommendedModules,
  initial_home_focus: preset.suggestedHomeFocus,
  initial_dashboard_tab: preset.suggestedDashboardTab || 'hoy',
  recommended_tutorials: preset.recommendedTutorials,
  simplicity_level: preset.simplicityLevel,
  highlighted_tools: preset.favoritePaths,
  hidden_tools: preset.hiddenPaths,
});

export const applyPresetToBusinessSettings = (
  existingSettings: Record<string, any>,
  businessType: BusinessTypeKey,
  options: {
    applyModules?: boolean;
    applyOnboarding?: boolean;
  } = {},
): Record<string, any> => {
  const { applyModules = true, applyOnboarding = true } = options;
  const baseSettings = { ...(existingSettings || {}) };
  const preset = getBusinessPreset(businessType);

  if (!preset) {
    throw new Error(`Business type '${businessType}' not found in presets`);
  }

  baseSettings.operational_profile = buildOperationalProfileFromPreset(preset);

  if (applyOnboarding) {
    baseSettings.personalization = buildPersonalizationFromPreset(preset);
    baseSettings.initial_setup = buildInitialSetupFromPreset(preset);
  }

  if (applyModules) {
    const moduleState = {
      sales: false,
      customers: false,
      products: false,
      accounts_receivable: false,
      reports: false,
      quotes: false,
      raw_inventory: false,
    };

    Object.keys(moduleState).forEach((moduleKey) => {
      moduleState[moduleKey as BusinessModuleKey] = preset.recommendedModules.includes(moduleKey as BusinessModuleKey);
    });

    baseSettings.modules = moduleState;
  }

  return baseSettings;
};

export const getPresetCompatibilityCheck = (
  businessType: BusinessTypeKey,
  currentModules: Record<string, boolean>,
) => {
  const preset = getBusinessPreset(businessType);
  if (!preset) {
    return {
      compatible: false,
      errors: [`Invalid business type: ${businessType}`],
      warnings: [],
      recommendedModules: [],
      missingRecommended: [],
      extraModules: [],
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];

  preset.incompatibleModules.forEach((incompatibleModule) => {
    if (currentModules[incompatibleModule]) {
      issues.push(`Module '${incompatibleModule}' is incompatible with ${preset.name}`);
    }
  });

  preset.requiredFeatures.forEach((requiredFeature) => {
    if (!currentModules[requiredFeature]) {
      warnings.push(`Feature '${requiredFeature}' is recommended for ${preset.name}`);
    }
  });

  const missingRecommended = preset.recommendedModules.filter((moduleKey) => !currentModules[moduleKey]);
  const extraModules = Object.keys(currentModules).filter(
    (moduleKey) =>
      currentModules[moduleKey]
      && !preset.recommendedModules.includes(moduleKey as BusinessModuleKey)
      && !preset.incompatibleModules.has(moduleKey as BusinessModuleKey),
  );

  return {
    compatible: issues.length === 0,
    preset: preset.key,
    preset_name: preset.name,
    issues,
    warnings,
    recommendedModules: preset.recommendedModules,
    missingRecommended,
    extraModules,
  };
};

export const getAllPresetsForUI = () =>
  BUSINESS_PRESET_UI_ORDER.map((presetKey) => {
    const preset = BUSINESS_PRESETS[presetKey];
    return {
      key: preset.key,
      name: preset.name,
      shortDescription: preset.shortDescription,
      longDescription: preset.longDescription,
      recommendedModules: preset.recommendedModules,
      recommendedMenuPaths: preset.recommendedMenuPaths,
      operationalModel: preset.operationalModel,
      fulfillmentMode: preset.fulfillmentMode,
      managesRawMaterials: preset.managesRawMaterials,
      tracksFinishedGoodsStock: preset.tracksFinishedGoodsStock,
    };
  });

export const inferBusinessTypeFromModules = (modules: Record<string, boolean>): BusinessTypeKey => {
  if (modules.raw_inventory) return 'production';
  if (modules.quotes) return 'services';
  if (modules.accounts_receivable) return 'wholesale';
  if (modules.products) return 'inventory_store';
  return 'simple_store';
};

export const getRecommendedModulesForBusinessType = (businessType?: BusinessTypeKey | null) => {
  const preset = getBusinessPreset(businessType || 'simple_store');
  return preset ? preset.recommendedModules : [];
};

export const resolveBusinessType = (business?: Business | Record<string, any> | null): BusinessTypeKey => {
  return resolveBusinessPresetFromSettings(business || null).key;
};
