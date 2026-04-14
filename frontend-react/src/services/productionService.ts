import type { Product, ProductMovement, Recipe, RecipeConsumption } from '../types';
import api from './api';
import { isPureOfflineRuntime } from './offlineLocalData';
import { offlineRecipesLocal } from './offlineRecipesLocal';

export interface RegisterProductionPayload {
  quantity: number;
  notes?: string | null;
}

export interface RegisterProductionResult {
  product?: Product;
  recipe?: Recipe;
  recipe_consumption?: RecipeConsumption;
  product_movement?: ProductMovement;
  [key: string]: any;
}

export const productionService = {
  async registerStockProduction(
    businessId: number,
    productId: number,
    payload: RegisterProductionPayload,
  ): Promise<RegisterProductionResult> {
    if (isPureOfflineRuntime()) {
      return offlineRecipesLocal.registerProduction(businessId, productId, payload);
    }

    const response = await api.post(`/businesses/${businessId}/products/${productId}/production`, {
      quantity: payload.quantity,
      notes: payload.notes?.trim() || undefined,
    });

    return response.data || {};
  },
};
