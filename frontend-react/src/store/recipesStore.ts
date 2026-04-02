import { create } from 'zustand';
import { Product, RawMaterial, Recipe, RecipeConsumption } from '../types';
import { recipesService, RecipeFilters, RecipePayload, RecipeConsumptionPayload } from '../services/recipesService';

interface RecipesState {
  recipes: Recipe[];
  references: { products: Product[]; raw_materials: RawMaterial[] };
  selectedRecipe: Recipe | null;
  recipeConsumptions: RecipeConsumption[];
  selectedConsumption: RecipeConsumption | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchReferences: (businessId: number) => Promise<void>;
  fetchRecipes: (businessId: number, filters?: RecipeFilters) => Promise<void>;
  fetchRecipeDetail: (businessId: number, recipeId: number) => Promise<Recipe | null>;
  saveRecipe: (businessId: number, payload: RecipePayload, recipeId?: number) => Promise<Recipe>;
  deactivateRecipe: (businessId: number, recipeId: number) => Promise<Recipe>;
  consumeRecipe: (businessId: number, recipeId: number, payload: RecipeConsumptionPayload) => Promise<RecipeConsumption>;
  fetchRecipeConsumptions: (businessId: number, recipeId: number) => Promise<void>;
  fetchConsumption: (businessId: number, consumptionId: number) => Promise<RecipeConsumption | null>;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  setSelectedConsumption: (consumption: RecipeConsumption | null) => void;
}

const upsertRecipe = (recipes: Recipe[], recipe: Recipe) => {
  const exists = recipes.some((item) => item.id === recipe.id);
  if (!exists) return [recipe, ...recipes];
  return recipes.map((item) => (item.id === recipe.id ? recipe : item));
};

export const useRecipesStore = create<RecipesState>((set) => ({
  recipes: [],
  references: { products: [], raw_materials: [] },
  selectedRecipe: null,
  recipeConsumptions: [],
  selectedConsumption: null,
  loading: false,
  saving: false,
  error: null,

  fetchReferences: async (businessId) => {
    set({ loading: true, error: null });
    try {
      const references = await recipesService.getReferences(businessId);
      set({ references });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchRecipes: async (businessId, filters) => {
    set({ loading: true, error: null });
    try {
      const recipes = await recipesService.list(businessId, filters);
      set({ recipes });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchRecipeDetail: async (businessId, recipeId) => {
    set({ loading: true, error: null });
    try {
      const result = await recipesService.get(businessId, recipeId);
      set((state) => ({
        selectedRecipe: result.recipe,
        recipeConsumptions: result.recent_consumptions,
        recipes: upsertRecipe(state.recipes, result.recipe),
      }));
      return result.recipe;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  saveRecipe: async (businessId, payload, recipeId) => {
    set({ saving: true, error: null });
    try {
      const recipe = recipeId
        ? await recipesService.update(businessId, recipeId, payload)
        : await recipesService.create(businessId, payload);
      set((state) => ({
        selectedRecipe: state.selectedRecipe?.id === recipe.id ? recipe : state.selectedRecipe,
        recipes: upsertRecipe(state.recipes, recipe),
      }));
      return recipe;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  deactivateRecipe: async (businessId, recipeId) => {
    set({ saving: true, error: null });
    try {
      const recipe = await recipesService.deactivate(businessId, recipeId);
      set((state) => ({
        selectedRecipe: state.selectedRecipe?.id === recipe.id ? recipe : state.selectedRecipe,
        recipes: upsertRecipe(state.recipes, recipe),
      }));
      return recipe;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  consumeRecipe: async (businessId, recipeId, payload) => {
    set({ saving: true, error: null });
    try {
      const consumption = await recipesService.consume(businessId, recipeId, payload);
      set((state) => ({
        recipeConsumptions: [consumption, ...state.recipeConsumptions],
        selectedConsumption: consumption,
      }));
      return consumption;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  fetchRecipeConsumptions: async (businessId, recipeId) => {
    set({ loading: true, error: null });
    try {
      const result = await recipesService.listConsumptions(businessId, recipeId);
      set({
        recipeConsumptions: result.consumptions,
        selectedRecipe: result.recipe,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchConsumption: async (businessId, consumptionId) => {
    set({ loading: true, error: null });
    try {
      const consumption = await recipesService.getConsumption(businessId, consumptionId);
      set({ selectedConsumption: consumption });
      return consumption;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),
  setSelectedConsumption: (consumption) => set({ selectedConsumption: consumption }),
}));
