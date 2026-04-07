import { Business, BusinessModuleKey } from '../types';
import type { BusinessOperationalModel } from './businessOperationalProfile';

// Re-exportar desde el backend para mantener consistencia
export type BusinessTypeKey = 'simple_store' | 'services' | 'production' | 'wholesale';

export interface BusinessPresetDefinition {
  key: BusinessTypeKey;
  name: string;
  shortDescription: string;
  longDescription: string;
  
  // Perfil operacional (mapeado a backend/services/business_presets.py)
  operationalModel: BusinessOperationalModel;
  inventoryModel?: string | null;
  fulfillmentMode?: 'stock' | 'make_to_order' | 'hybrid' | 'service' | null;
  productionMode?: string | null;
  recipeMode?: string | null;
  productionControlMode?: string | null;
  
  // Flags derivados del perfil operacional
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
  
  // Módulos técnicos recomendados
  recommendedModules: BusinessModuleKey[];
  
  // Secciones comerciales visibles
  commercialSections: Record<string, boolean>;
  
  // Navegación prioritaria
  recommendedMenuPaths: string[];
  favoritePaths: string[];
  hiddenPaths: string[];
  prioritizedPath?: string | null;
  
  // Configuración de onboarding
  suggestedHomeFocus?: string | null;
  suggestedDashboardTab?: string | null;
  simplicityLevel: string;
  recommendedTutorials: string[];
  
  // Restricciones y compatibilidades
  incompatibleModules: Set<BusinessModuleKey>;
  requiredFeatures: Set<string>;
}

// Presets sincronizados con backend/services/business_presets.py
export const BUSINESS_PRESETS: Record<BusinessTypeKey, BusinessPresetDefinition> = {
  simple_store: {
    key: 'simple_store',
    name: 'Tienda simple',
    shortDescription: 'Para negocios que venden rápido y quieren ver solo lo esencial.',
    longDescription: 'Prioriza registrar ventas, llevar gastos del día, controlar clientes frecuentes, manejar productos y consultar reportes sin saturar la navegación.',
    
    // Perfil operacional: reventa simple
    operationalModel: 'resale_fixed_stock',
    inventoryModel: 'finished_goods',
    fulfillmentMode: 'stock',
    
    // Flags derivados
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
    
    // Módulos técnicos
    recommendedModules: ['sales', 'customers', 'products', 'reports'],
    
    // Secciones comerciales
    commercialSections: { invoices: true, orders: false, sales_goals: false },
    
    // Navegación
    recommendedMenuPaths: [
      '/dashboard', '/sales', '/expenses', '/products', 
      '/customers', '/alerts', '/reports'
    ],
    favoritePaths: ['/sales', '/products'],
    hiddenPaths: [],
    prioritizedPath: '/sales',
    
    // Onboarding
    suggestedHomeFocus: 'sales',
    suggestedDashboardTab: 'hoy',
    simplicityLevel: 'simple',
    recommendedTutorials: ['first_sale', 'basic_expenses'],
    
    // Restricciones
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: new Set([]),
  },
  
  services: {
    key: 'services',
    name: 'Encargos o servicios',
    shortDescription: 'Para negocios que cotizan, convierten propuestas y cobran después.',
    longDescription: 'Da prioridad al flujo comercial desde la cotización hasta el cobro, sin perder de vista los gastos operativos del negocio.',
    
    // Perfil operacional: servicios sin stock
    operationalModel: 'service_no_stock',
    inventoryModel: 'none',
    fulfillmentMode: 'service',
    
    // Flags derivados
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
    
    // Módulos técnicos
    recommendedModules: ['sales', 'customers', 'accounts_receivable', 'quotes', 'reports'],
    
    // Secciones comerciales
    commercialSections: { invoices: true, orders: true, sales_goals: false },
    
    // Navegación
    recommendedMenuPaths: [
      '/dashboard', '/quotes', '/sales', '/expenses', '/payments', 
      '/customers', '/alerts', '/reports'
    ],
    favoritePaths: ['/quotes', '/payments'],
    hiddenPaths: [],
    prioritizedPath: '/quotes',
    
    // Onboarding
    suggestedHomeFocus: 'collections',
    suggestedDashboardTab: 'balance',
    simplicityLevel: 'guided',
    recommendedTutorials: ['first_quote', 'quote_to_sale', 'payment_registration'],
    
    // Restricciones
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: new Set(['quotes']),
  },
  
  production: {
    key: 'production',
    name: 'Producción, restaurante o repostería',
    shortDescription: 'Para negocios que trabajan con insumos, recetas y control de costos.',
    longDescription: 'Activa el flujo de bodega para materias primas, compras, gastos operativos, recetas y calculadora de costos, sin crear módulos nuevos.',
    
    // Perfil operacional: producción con materias primas
    operationalModel: 'production_make_to_order',
    inventoryModel: 'mixed',
    fulfillmentMode: 'make_to_order',
    productionMode: 'to_order',
    recipeMode: 'fixed',
    productionControlMode: 'enabled',
    
    // Flags derivados
    tracksFinishedGoodsStock: true,
    managesRawMaterials: true,
    usesRawInventory: true,
    usesRecipes: true,
    controlsProduction: true,
    supportsQuotes: true,
    supportsMakeToOrder: true,
    consumesRawMaterialsOnProduction: true,
    consumesRawMaterialsOnQuoteConversion: true,
    consumesRawMaterialsOnSale: false,
    
    // Módulos técnicos
    recommendedModules: ['sales', 'products', 'raw_inventory', 'reports'],
    
    // Secciones comerciales
    commercialSections: { invoices: false, orders: true, sales_goals: false },
    
    // Navegación
    recommendedMenuPaths: [
      '/dashboard', '/sales', '/raw-inventory', '/raw-purchases', 
      '/expenses', '/recipes', '/cost-calculator', '/alerts', '/reports'
    ],
    favoritePaths: ['/raw-inventory', '/recipes'],
    hiddenPaths: [],
    prioritizedPath: '/raw-inventory',
    
    // Onboarding
    suggestedHomeFocus: 'products',
    suggestedDashboardTab: 'analiticas',
    simplicityLevel: 'guided',
    recommendedTutorials: ['raw_materials', 'recipes', 'cost_calculation'],
    
    // Restricciones
    incompatibleModules: new Set([]),
    requiredFeatures: new Set(['raw_inventory']),
  },
  
  wholesale: {
    key: 'wholesale',
    name: 'Mayorista o distribuidor',
    shortDescription: 'Para negocios con catálogo amplio, clientes recurrentes y cartera activa.',
    longDescription: 'Enfoca la navegación en ventas, cartera, gastos recurrentes y reportes, dejando bodega avanzada solo si realmente la necesitas.',
    
    // Perfil operacional: reventa con cartera activa
    operationalModel: 'resale_fixed_stock',
    inventoryModel: 'finished_goods',
    fulfillmentMode: 'stock',
    
    // Flags derivados
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
    
    // Módulos técnicos
    recommendedModules: ['sales', 'customers', 'products', 'accounts_receivable', 'reports'],
    
    // Secciones comerciales
    commercialSections: { invoices: true, orders: true, sales_goals: true },
    
    // Navegación
    recommendedMenuPaths: [
      '/dashboard', '/sales', '/customers', '/payments', '/expenses', 
      '/products', '/alerts', '/reports'
    ],
    favoritePaths: ['/sales', '/payments'],
    hiddenPaths: [],
    prioritizedPath: '/customers',
    
    // Onboarding
    suggestedHomeFocus: 'collections',
    suggestedDashboardTab: 'balance',
    simplicityLevel: 'guided',
    recommendedTutorials: ['customer_management', 'credit_sales', 'payment_followup'],
    
    // Restricciones
    incompatibleModules: new Set(['raw_inventory']),
    requiredFeatures: new Set([]),
  },
};

// Helper functions para compatibilidad con código existente
export const getBusinessPreset = (businessType: BusinessTypeKey | string | null): BusinessPresetDefinition | null => {
  if (!businessType) return null;
  return BUSINESS_PRESETS[businessType as BusinessTypeKey] || null;
};

export const resolveBusinessPresetFromSettings = (business: Business | Record<string, any> | null): BusinessPresetDefinition => {
  if (!business) return BUSINESS_PRESETS.simple_store;
  
  const settings = 'settings' in business ? business.settings : business;
  if (!settings || typeof settings !== 'object') return BUSINESS_PRESETS.simple_store;
  
  // 1. Buscar business_type explícito en personalization
  const personalization = settings.personalization || {};
  const explicitBusinessType = personalization.business_type;
  if (explicitBusinessType) {
    const preset = getBusinessPreset(explicitBusinessType);
    if (preset) return preset;
  }
  
  // 2. Inferir desde operational_profile
  const operationalProfile = settings.operational_profile || {};
  const operationalModel = operationalProfile.operational_model;
  
  if (operationalModel) {
    if (operationalModel === 'service_no_stock') {
      return BUSINESS_PRESETS.services;
    } else if (operationalModel === 'production_fixed_stock' || operationalModel === 'production_make_to_order') {
      // Verificar si usa materias primas
      const managesRawMaterials = operationalProfile.manages_raw_materials || false;
      if (managesRawMaterials) {
        return BUSINESS_PRESETS.production;
      } else {
        return BUSINESS_PRESETS.services; // Producción simple sin raw materials
      }
    } else if (operationalModel === 'resale_fixed_stock') {
      // Diferenciar simple vs wholesale por módulos activos
      const modules = settings.modules || {};
      const hasAccountsReceivable = modules.accounts_receivable || false;
      if (hasAccountsReceivable) {
        return BUSINESS_PRESETS.wholesale;
      } else {
        return BUSINESS_PRESETS.simple_store;
      }
    }
  }
  
  // 3. Inferir desde módulos activos (fallback legacy)
  const modules = settings.modules || {};
  if (modules.raw_inventory) {
    return BUSINESS_PRESETS.production;
  } else if (modules.quotes) {
    return BUSINESS_PRESETS.services;
  } else if (modules.accounts_receivable) {
    return BUSINESS_PRESETS.wholesale;
  }
  
  // 4. Default: simple_store
  return BUSINESS_PRESETS.simple_store;
};

export const buildOperationalProfileFromPreset = (preset: BusinessPresetDefinition) => {
  return {
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
  };
};

export const buildPersonalizationFromPreset = (preset: BusinessPresetDefinition) => {
  return {
    business_type: preset.key,
    visibility_mode: preset.simplicityLevel === 'simple' ? 'basic' : 'advanced',
    navigation_defaults: {
      business_type: preset.key,
      favorite_paths: preset.favoritePaths,
      hidden_paths: preset.hiddenPaths,
      prioritized_path: preset.prioritizedPath,
      last_applied_at: null, // Se llenará en runtime
    },
    commercial_sections: preset.commercialSections,
    onboarding: {
      completed: false,
      skipped: false,
      last_updated_at: null,
      answers: {}, // Se llenará si hay onboarding
      suggested_business_type: preset.key,
      suggested_modules: preset.recommendedModules,
      applied_modules_once: false,
    },
  };
};

export const buildInitialSetupFromPreset = (preset: BusinessPresetDefinition) => {
  return {
    version: 1,
    onboarding_profile: {
      business_category: preset.managesRawMaterials ? 'production' : preset.operationalModel === 'service_no_stock' ? 'services' : 'products',
      inventory_mode: preset.tracksFinishedGoodsStock ? 'yes' : 'no',
      sales_flow: preset.supportsQuotes ? 'quotes_invoices' : 'immediate',
      home_focus: preset.suggestedHomeFocus || 'sales',
      team_mode: 'solo',
      documents_mode: 'simple_receipts',
      operations_mode: preset.controlsProduction ? 'production' : 'resale',
      operational_model: preset.operationalModel,
      raw_materials_mode: preset.managesRawMaterials ? 'yes' : 'no',
      recipe_mode: preset.recipeMode || 'none',
      selling_mode: preset.supportsMakeToOrder ? 'by_order' : 'stock',
      production_control: preset.productionControlMode || 'no',
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
  };
};

export const applyPresetToBusinessSettings = (
  existingSettings: Record<string, any>,
  businessType: BusinessTypeKey,
  options: {
    applyModules?: boolean;
    applyOnboarding?: boolean;
  } = {}
): Record<string, any> => {
  const { applyModules = true, applyOnboarding = true } = options;
  
  const baseSettings = { ...(existingSettings || {}) };
  const preset = getBusinessPreset(businessType);
  
  if (!preset) {
    throw new Error(`Business type '${businessType}' not found in presets`);
  }
  
  // Construir componentes del preset
  const operationalProfile = buildOperationalProfileFromPreset(preset);
  const personalization = buildPersonalizationFromPreset(preset);
  const initialSetup = buildInitialSetupFromPreset(preset);
  
  // Aplicar a settings
  baseSettings.operational_profile = operationalProfile;
  
  if (applyOnboarding) {
    baseSettings.personization = personalization;
    baseSettings.initial_setup = initialSetup;
  }
  
  // Mantener módulos existentes si no se especifica lo contrario
  if (applyModules && !baseSettings.modules) {
    baseSettings.modules = {
      sales: true,
      customers: true,
      products: true,
      accounts_receivable: true,
      reports: true,
      quotes: false,
      raw_inventory: false,
    };
    
    // Aplicar módulos recomendados del preset
    Object.keys(baseSettings.modules).forEach(module => {
      baseSettings.modules[module] = preset.recommendedModules.includes(module as BusinessModuleKey);
    });
  }
  
  return baseSettings;
};

export const getPresetCompatibilityCheck = (
  businessType: BusinessTypeKey,
  currentModules: Record<string, boolean>
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
  
  // Verificar módulos incompatibles
  preset.incompatibleModules.forEach(incompatibleModule => {
    if (currentModules[incompatibleModule]) {
      issues.push(`Module '${incompatibleModule}' is incompatible with ${preset.name}`);
    }
  });
  
  // Verificar features requeridas
  preset.requiredFeatures.forEach(requiredFeature => {
    if (!currentModules[requiredFeature]) {
      warnings.push(`Feature '${requiredFeature}' is recommended for ${preset.name}`);
    }
  });
  
  // Verificar cambios de módulos recomendados
  const missingRecommended = preset.recommendedModules.filter(
    module => !currentModules[module]
  );
  const extraModules = Object.keys(currentModules).filter(
    module => 
      currentModules[module] && 
      !preset.recommendedModules.includes(module as BusinessModuleKey) && 
      !preset.incompatibleModules.has(module as BusinessModuleKey)
  );
  
  if (missingRecommended.length > 0) {
    warnings.push(`Recommended modules missing: ${missingRecommended.join(', ')}`);
  }
  
  if (extraModules.length > 0) {
    warnings.push(`Extra modules enabled: ${extraModules.join(', ')}`);
  }
  
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

// Helper functions para integración con código existente
export const getAllPresetsForUI = () => {
  return Object.values(BUSINESS_PRESETS).map(preset => ({
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
  }));
};

export const inferBusinessTypeFromModules = (modules: Record<string, boolean>): BusinessTypeKey => {
  if (modules.raw_inventory) {
    return 'production';
  } else if (modules.quotes) {
    return 'services';
  } else if (modules.accounts_receivable) {
    return 'wholesale';
  } else {
    return 'simple_store';
  }
};

// Compatibilidad con businessPersonalization.ts existente
export const getRecommendedModulesForBusinessType = (businessType?: BusinessTypeKey | null) => {
  const preset = getBusinessPreset(businessType || 'simple_store');
  return preset ? preset.recommendedModules : [];
};

export const resolveBusinessType = (business?: Business | Record<string, any> | null): BusinessTypeKey => {
  return resolveBusinessPresetFromSettings(business || null).key;
};
