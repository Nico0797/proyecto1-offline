// Compatibilidad con código existente durante migración a presets unificados
// Este archivo se eliminará cuando toda la codebase use businessPresets.ts directamente

import {
  BUSINESS_PRESETS,
  BUSINESS_PRESET_UI_ORDER,
  type BusinessTypeKey as PresetBusinessTypeKey,
  getBusinessPreset,
  resolveBusinessPresetFromSettings,
  buildOperationalProfileFromPreset,
  buildPersonalizationFromPreset,
  buildInitialSetupFromPreset,
  applyPresetToBusinessSettings,
  getPresetCompatibilityCheck,
  getAllPresetsForUI,
  inferBusinessTypeFromModules,
  getRecommendedModulesForBusinessType as getPresetRecommendedModules,
  resolveBusinessType as resolvePresetBusinessType,
} from './businessPresets';
import { Business, BusinessModuleKey } from '../types';
import type { BusinessType } from '../types';
import type { BusinessOperationalModel } from './businessOperationalProfile';

// Re-exportar tipos base
export type BusinessTypeKey = PresetBusinessTypeKey;
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
  simple_business_type?: BusinessType | null;
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

// Re-exportar presets con alias para compatibilidad
export { BUSINESS_PRESETS };
export { BUSINESS_PRESET_UI_ORDER };
export { getBusinessPreset as getBusinessTypePreset };
export { resolveBusinessPresetFromSettings };
export { buildOperationalProfileFromPreset };
export { buildPersonalizationFromPreset };
export { buildInitialSetupFromPreset };
export { applyPresetToBusinessSettings };
export { getPresetCompatibilityCheck };
export { getAllPresetsForUI };
export { inferBusinessTypeFromModules };
export { getPresetRecommendedModules as getRecommendedModulesForBusinessType };
export { resolvePresetBusinessType as resolveBusinessType };

// Alias para compatibilidad con código existente
export const BUSINESS_TYPE_PRESETS = BUSINESS_PRESETS;

// Funciones legacy que dependen de la estructura anterior
export const getBusinessTypePresetDefinition = (businessType: BusinessTypeKey): BusinessTypePreset => {
  const preset = getBusinessPreset(businessType);
  if (!preset) {
    throw new Error(`Business type '${businessType}' not found in presets`);
  }
  
  return {
    key: preset.key,
    label: preset.name,
    shortDescription: preset.shortDescription,
    longDescription: preset.longDescription,
    recommendedModules: preset.recommendedModules,
    coveredExperiences: preset.recommendedMenuPaths.filter(path => 
      !['/dashboard', '/alerts', '/reports', '/help', '/settings'].includes(path)
    ),
    recommendedMenuPaths: preset.recommendedMenuPaths,
  };
};

// Funciones auxiliares legacy
export const getEnabledBusinessModules = (business?: Business | null): BusinessModuleKey[] => {
  if (!business?.modules) return [];
  
  return business.modules
    .filter((moduleState) => moduleState?.enabled)
    .map((moduleState) => moduleState.module_key);
};

export const getBusinessPersonalizationSettings = (business?: Business | null): BusinessPersonalizationSettings => {
  if (!business?.settings) {
    return {
      commercial_sections: DEFAULT_BUSINESS_COMMERCIAL_SECTIONS,
      onboarding: {
        completed: false,
        skipped: false,
        answers: DEFAULT_PERSONALIZATION_ANSWERS,
      },
    };
  }
  
  const settings = business.settings;
  return {
      business_type: settings.personalization?.business_type || null,
      simple_business_type: settings.personalization?.simple_business_type || null,
      visibility_mode: settings.personalization?.visibility_mode || null,
    navigation_defaults: settings.personalization?.navigation_defaults || null,
    commercial_sections: {
      ...DEFAULT_BUSINESS_COMMERCIAL_SECTIONS,
      ...settings.personalization?.commercial_sections,
    },
    onboarding: {
      completed: settings.personalization?.onboarding?.completed || false,
      skipped: settings.personalization?.onboarding?.skipped || false,
      last_updated_at: settings.personalization?.onboarding?.last_updated_at || null,
      answers: {
        ...DEFAULT_PERSONALIZATION_ANSWERS,
        ...settings.personalization?.onboarding?.answers,
      },
      suggested_business_type: settings.personalization?.onboarding?.suggested_business_type || null,
      suggested_modules: settings.personalization?.onboarding?.suggested_modules || [],
      applied_modules_once: settings.personalization?.onboarding?.applied_modules_once || false,
    },
  };
};

export const getBusinessBaseState = (business?: Business | null): BusinessBaseState => {
  const personalization = getBusinessPersonalizationSettings(business);
  const explicitBusinessType = personalization.business_type;
  
  if (explicitBusinessType) {
    return {
      source: 'explicit',
      effectiveBusinessType: explicitBusinessType,
      explicitBusinessType,
      suggestedBusinessType: null,
      inferredBusinessType: explicitBusinessType,
      needsReview: false,
    };
  }
  
  const inferredType = resolveBusinessPresetFromSettings(business || null);
  return {
    source: 'inferred',
    effectiveBusinessType: inferredType.key,
    explicitBusinessType: null,
    suggestedBusinessType: null,
    inferredBusinessType: inferredType.key,
    needsReview: true,
  };
};

export const getBusinessNavigationDefaults = (business?: Business | null): BusinessNavigationDefaults | null => {
  const personalization = getBusinessPersonalizationSettings(business);
  return personalization.navigation_defaults || null;
};

export const getBusinessInitialSetup = (business?: Business | null): BusinessInitialSetupSettings | null => {
  if (!business?.settings) return null;
  return business.settings.initial_setup || null;
};

export const getBusinessCommercialSections = (business?: Business | null): BusinessCommercialSectionsState => {
  const personalization = getBusinessPersonalizationSettings(business);
  return personalization.commercial_sections;
};

export const isBusinessCommercialSectionEnabled = (
  business: Business | null | undefined,
  sectionKey: BusinessCommercialSectionKey
): boolean => {
  const sections = getBusinessCommercialSections(business);
  return sections[sectionKey] || false;
};

export const getMissingRecommendedModules = (
  currentModules: BusinessModuleKey[],
  recommendedModules: BusinessModuleKey[]
): BusinessModuleKey[] => {
  return recommendedModules.filter(module => !currentModules.includes(module));
};

export const buildPersonalizationSettingsPatch = (
  currentSettings: Record<string, any>,
  updates: Partial<BusinessPersonalizationSettings>
): Record<string, any> => {
  const personalization = {
    ...currentSettings.personalization,
    ...updates,
  };
  
  return {
    ...currentSettings,
    personalization,
  };
};
