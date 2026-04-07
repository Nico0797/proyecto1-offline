import api from './api';
import { CostCalculatorSimulation, Recipe } from '../types';

export interface CostCalculatorItemPayload {
  raw_material_id: number;
  quantity_required: number;
  manual_cost_override?: number | null;
  notes?: string | null;
  sort_order?: number;
}

export interface CostCalculatorSimulationPayload {
  product_id?: number | null;
  product_name?: string | null;
  quantity_produced?: number;
  quantity_base?: number;
  items: CostCalculatorItemPayload[];
  packaging_cost?: number;
  labor_cost?: number;
  overhead_cost?: number;
  other_cost?: number;
  target_margin_percent?: number | null;
  target_sale_price?: number | null;
}

export interface CostCalculatorSavePayload extends CostCalculatorSimulationPayload {
  save_mode?: 'create' | 'update_existing' | 'create_new_version';
  recipe_id?: number | null;
  recipe_name?: string | null;
  recipe_notes?: string | null;
  is_active?: boolean;
  deactivate_existing_recipe?: boolean;
  update_product_cost?: boolean;
  update_product_sale_price?: boolean;
}

export interface CostCalculatorSaveResponse {
  recipe?: Recipe | null;
  simulation: CostCalculatorSimulation;
  save_mode: 'create' | 'update_existing' | 'create_new_version';
  replaced_historical_recipe: boolean;
  product_updated: boolean;
  updated_product_fields?: Record<string, number>;
  recipe_scope_message?: string | null;
}

export const costCalculatorService = {
  async simulate(businessId: number, payload: CostCalculatorSimulationPayload): Promise<CostCalculatorSimulation> {
    const response = await api.post(`/businesses/${businessId}/cost-calculator/simulate`, payload);
    return response.data.simulation;
  },

  async saveAsRecipe(businessId: number, payload: CostCalculatorSavePayload): Promise<CostCalculatorSaveResponse> {
    const response = await api.post(`/businesses/${businessId}/cost-calculator/save-as-recipe`, payload);
    return response.data;
  },
};
