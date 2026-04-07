import api from './api';
import { Product, RawMaterial, Recipe, RecipeConsumption, RecipeCosting } from '../types';

export interface RecipeFilters {
  search?: string;
  product_id?: number;
  include_inactive?: boolean;
}

export interface RecipePayloadItem {
  raw_material_id: number;
  quantity_required: number;
  notes?: string | null;
  sort_order?: number | null;
}

export interface RecipePayload {
  product_id: number;
  name: string;
  notes?: string | null;
  is_active?: boolean;
  items?: RecipePayloadItem[];
}

export interface RecipeConsumptionPayload {
  quantity_produced_or_sold: number;
  notes?: string | null;
}

export interface RecipeReferencesResponse {
  products: Product[];
  raw_materials: RawMaterial[];
}

export interface RecipeDetailResponse {
  recipe: Recipe;
  recent_consumptions: RecipeConsumption[];
}

const normalizeFilters = (filters?: RecipeFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.product_id) params.product_id = filters.product_id;
  if (filters.include_inactive) params.include_inactive = true;
  return params;
};

export const recipesService = {
  async getReferences(businessId: number): Promise<RecipeReferencesResponse> {
    const response = await api.get(`/businesses/${businessId}/recipes/references`);
    return {
      products: response.data?.products || [],
      raw_materials: response.data?.raw_materials || [],
    };
  },

  async list(businessId: number, filters?: RecipeFilters): Promise<Recipe[]> {
    const response = await api.get(`/businesses/${businessId}/recipes`, {
      params: normalizeFilters(filters),
    });
    return response.data?.recipes || [];
  },

  async get(businessId: number, recipeId: number): Promise<RecipeDetailResponse> {
    const response = await api.get(`/businesses/${businessId}/recipes/${recipeId}`);
    return {
      recipe: response.data.recipe,
      recent_consumptions: response.data.recent_consumptions || [],
    };
  },

  async getCosting(businessId: number, recipeId: number): Promise<RecipeCosting> {
    const response = await api.get(`/businesses/${businessId}/recipes/${recipeId}/costing`);
    return response.data.costing;
  },

  async create(businessId: number, payload: RecipePayload): Promise<Recipe> {
    const response = await api.post(`/businesses/${businessId}/recipes`, payload);
    return response.data.recipe;
  },

  async update(businessId: number, recipeId: number, payload: RecipePayload): Promise<Recipe> {
    const response = await api.put(`/businesses/${businessId}/recipes/${recipeId}`, payload);
    return response.data.recipe;
  },

  async deactivate(businessId: number, recipeId: number): Promise<Recipe> {
    const response = await api.delete(`/businesses/${businessId}/recipes/${recipeId}`);
    return response.data.recipe;
  },

  async consume(businessId: number, recipeId: number, payload: RecipeConsumptionPayload): Promise<RecipeConsumption> {
    const response = await api.post(`/businesses/${businessId}/recipes/${recipeId}/consume`, payload);
    return response.data.recipe_consumption;
  },

  async listConsumptions(businessId: number, recipeId: number): Promise<{ recipe: Recipe; consumptions: RecipeConsumption[] }> {
    const response = await api.get(`/businesses/${businessId}/recipes/${recipeId}/consumptions`);
    return {
      recipe: response.data.recipe,
      consumptions: response.data.consumptions || [],
    };
  },

  async getConsumption(businessId: number, consumptionId: number): Promise<RecipeConsumption> {
    const response = await api.get(`/businesses/${businessId}/recipe-consumptions/${consumptionId}`);
    return response.data.recipe_consumption;
  },
};
