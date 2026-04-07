import type { Business } from '../types';

export type BusinessOperationalModel =
  | 'production_fixed_stock'
  | 'production_make_to_order'
  | 'resale_fixed_stock'
  | 'service_no_stock'
  | 'mixed';

export type BusinessOperationalInventoryModel =
  | 'finished_goods'
  | 'raw_materials_only'
  | 'resale_products'
  | 'none'
  | 'mixed';

export type BusinessFulfillmentMode = 'stock' | 'make_to_order' | 'hybrid' | 'service';
export type BusinessProductionMode = 'to_stock' | 'to_order' | 'none' | 'mixed';
export type BusinessRecipeMode = 'fixed' | 'variable' | 'none' | 'mixed';
export type BusinessProductionControlMode = 'enabled' | 'disabled' | 'later';

export interface BusinessOperationalProfile {
  version: number;
  operational_model: BusinessOperationalModel | null;
  inventory_model: BusinessOperationalInventoryModel | null;
  fulfillment_mode: BusinessFulfillmentMode | null;
  production_mode: BusinessProductionMode | null;
  recipe_mode: BusinessRecipeMode | null;
  production_control_mode: BusinessProductionControlMode | null;
  manages_raw_materials: boolean;
  tracks_finished_goods_stock: boolean;
  uses_raw_inventory: boolean;
  uses_recipes: boolean;
  controls_production: boolean;
  supports_quotes: boolean;
  supports_make_to_order: boolean;
  consumes_raw_materials_on_production: boolean;
  consumes_raw_materials_on_sale: boolean;
  consumes_raw_materials_on_quote_conversion: boolean;
}

export const DEFAULT_BUSINESS_OPERATIONAL_PROFILE: BusinessOperationalProfile = {
  version: 1,
  operational_model: null,
  inventory_model: null,
  fulfillment_mode: null,
  production_mode: null,
  recipe_mode: null,
  production_control_mode: null,
  manages_raw_materials: false,
  tracks_finished_goods_stock: false,
  uses_raw_inventory: false,
  uses_recipes: false,
  controls_production: false,
  supports_quotes: false,
  supports_make_to_order: false,
  consumes_raw_materials_on_production: false,
  consumes_raw_materials_on_sale: false,
  consumes_raw_materials_on_quote_conversion: false,
};

const readOperationalProfilePayload = (source?: Business | Record<string, any> | null) => {
  if (!source) return null;
  if ('settings' in source) {
    return (source.settings as Record<string, any> | null | undefined)?.operational_profile || null;
  }
  return (source as Record<string, any>).operational_profile || null;
};

export const normalizeBusinessOperationalProfile = (
  profile?: Partial<BusinessOperationalProfile> | null
): BusinessOperationalProfile => {
  const nextProfile = profile || {};

  return {
    version: Number(nextProfile.version || DEFAULT_BUSINESS_OPERATIONAL_PROFILE.version),
    operational_model: nextProfile.operational_model || null,
    inventory_model: nextProfile.inventory_model || null,
    fulfillment_mode: nextProfile.fulfillment_mode || null,
    production_mode: nextProfile.production_mode || null,
    recipe_mode: nextProfile.recipe_mode || null,
    production_control_mode: nextProfile.production_control_mode || null,
    manages_raw_materials: !!nextProfile.manages_raw_materials,
    tracks_finished_goods_stock: !!nextProfile.tracks_finished_goods_stock,
    uses_raw_inventory: !!nextProfile.uses_raw_inventory,
    uses_recipes: !!nextProfile.uses_recipes,
    controls_production: !!nextProfile.controls_production,
    supports_quotes: !!nextProfile.supports_quotes,
    supports_make_to_order: !!nextProfile.supports_make_to_order,
    consumes_raw_materials_on_production: !!nextProfile.consumes_raw_materials_on_production,
    consumes_raw_materials_on_sale: !!nextProfile.consumes_raw_materials_on_sale,
    consumes_raw_materials_on_quote_conversion: !!nextProfile.consumes_raw_materials_on_quote_conversion,
  };
};

export const getBusinessOperationalProfile = (
  source?: Business | Record<string, any> | null
): BusinessOperationalProfile => {
  return normalizeBusinessOperationalProfile(readOperationalProfilePayload(source));
};

export const areBusinessOperationalProfilesEqual = (
  left?: BusinessOperationalProfile | null,
  right?: BusinessOperationalProfile | null
) => {
  return JSON.stringify(normalizeBusinessOperationalProfile(left)) === JSON.stringify(normalizeBusinessOperationalProfile(right));
};

export const buildOperationalProfileSettingsPatch = (
  currentSettings: Record<string, any> | null | undefined,
  operationalProfile: BusinessOperationalProfile
) => {
  return {
    ...(currentSettings || {}),
    operational_profile: normalizeBusinessOperationalProfile(operationalProfile),
  };
};

export const businessTracksFinishedGoodsStock = (source?: Business | Record<string, any> | null) => {
  return getBusinessOperationalProfile(source).tracks_finished_goods_stock;
};

export const businessManagesRawMaterials = (source?: Business | Record<string, any> | null) => {
  return getBusinessOperationalProfile(source).manages_raw_materials;
};

export const businessSupportsMakeToOrder = (source?: Business | Record<string, any> | null) => {
  return getBusinessOperationalProfile(source).supports_make_to_order;
};
