import { Product, ProductMovement, RawMaterial, RawMaterialMovement, Recipe, RecipeConsumption, RecipeCosting } from '../types';
import { offlineSyncService } from './offlineSyncService';
import { nextLocalNumericId, normalizeText, readLocalCollection, writeLocalCollection } from './offlineLocalData';
import type { RecipeConsumptionPayload, RecipeFilters, RecipePayload, RecipeReferencesResponse } from './recipesService';
import type { RegisterProductionPayload, RegisterProductionResult } from './productionService';

const RECIPES_COLLECTION = 'recipes';
const RECIPE_CONSUMPTIONS_COLLECTION = 'recipe_consumptions';
const RAW_MATERIALS_COLLECTION = 'raw_materials';
const RAW_MOVEMENTS_COLLECTION = 'raw_material_movements';
const PRODUCT_MOVEMENTS_COLLECTION = 'product_movements';

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const buildOfflineValidationError = (message: string, data?: Record<string, any>) => {
  const error = new Error(message) as Error & { response?: { data?: Record<string, any> } };
  error.response = { data: { error: message, ...data } };
  return error;
};

const sortRecipes = (recipes: Recipe[]) => (
  [...recipes].sort((left, right) => new Date(right.updated_at || right.created_at || 0).getTime() - new Date(left.updated_at || left.created_at || 0).getTime())
);

const sortConsumptions = (consumptions: RecipeConsumption[]) => (
  [...consumptions].sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
);

const hydrateRecipe = (recipe: Recipe, products: Product[], rawMaterials: RawMaterial[], consumptions: RecipeConsumption[]): Recipe => {
  const product = products.find((entry) => Number(entry.id) === Number(recipe.product_id));
  const items = (recipe.items || [])
    .map((item, index) => {
      const material = rawMaterials.find((entry) => Number(entry.id) === Number(item.raw_material_id));
      return {
        ...item,
        id: item.id ?? index + 1,
        recipe_id: recipe.id,
        raw_material_name: material?.name ?? item.raw_material_name ?? null,
        raw_material_unit: material?.unit ?? item.raw_material_unit ?? null,
        reference_cost: material?.reference_cost ?? item.reference_cost ?? null,
        sort_order: item.sort_order ?? index,
      };
    })
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));

  return {
    ...recipe,
    product_name: product?.name ?? recipe.product_name ?? null,
    product_type: (product as any)?.type ?? recipe.product_type ?? null,
    items,
    items_count: items.length,
    consumptions_count: consumptions.filter((entry) => Number(entry.recipe_id) === Number(recipe.id)).length,
    theoretical_total_cost: Number(items.reduce(
      (sum, item) => sum + Number(item.quantity_required || 0) * Number(item.reference_cost || 0),
      0,
    ).toFixed(4)),
  };
};

const buildCosting = (recipe: Recipe): RecipeCosting => {
  const items = (recipe.items || []).map((item) => ({
    id: item.id,
    raw_material_id: item.raw_material_id,
    raw_material_name: item.raw_material_name ?? null,
    raw_material_unit: item.raw_material_unit ?? null,
    quantity_required: item.quantity_required,
    cost_base: item.reference_cost ?? null,
    reference_cost: item.reference_cost ?? null,
    line_cost: item.reference_cost == null ? null : Number((Number(item.quantity_required || 0) * Number(item.reference_cost || 0)).toFixed(4)),
  }));

  const missing = items.filter((item) => item.reference_cost == null).length;
  const partial = Number(items.reduce((sum, item) => sum + Number(item.line_cost || 0), 0).toFixed(4));
  const complete = missing === 0;

  return {
    theoretical_unit_cost: complete ? partial : null,
    partial_theoretical_total_cost: partial,
    is_cost_complete: complete,
    cost_status: complete ? 'complete' : 'missing_cost',
    cost_status_label: complete ? 'Completo' : 'Costo incompleto',
    cost_status_message: complete
      ? 'Todos los insumos tienen costo base local.'
      : 'Faltan costos base en algunos insumos guardados localmente.',
    cost_rule_label: 'Costeo local offline',
    missing_cost_items_count: missing,
    items,
  };
};

const readContext = async (businessId: number) => {
  const [products, rawMaterials] = await Promise.all([
    offlineSyncService.getProductsFromLocal(businessId),
    Promise.resolve(readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION)),
  ]);

  return {
    products,
    rawMaterials,
    recipes: readLocalCollection<Recipe>(businessId, RECIPES_COLLECTION),
    consumptions: readLocalCollection<RecipeConsumption>(businessId, RECIPE_CONSUMPTIONS_COLLECTION),
    rawMovements: readLocalCollection<RawMaterialMovement>(businessId, RAW_MOVEMENTS_COLLECTION),
    productMovements: readLocalCollection<ProductMovement>(businessId, PRODUCT_MOVEMENTS_COLLECTION),
  };
};

const persistContext = (
  businessId: number,
  context: Awaited<ReturnType<typeof readContext>>,
) => {
  writeLocalCollection(businessId, RECIPES_COLLECTION, sortRecipes(context.recipes));
  writeLocalCollection(businessId, RECIPE_CONSUMPTIONS_COLLECTION, sortConsumptions(context.consumptions));
  writeLocalCollection(businessId, RAW_MATERIALS_COLLECTION, context.rawMaterials);
  writeLocalCollection(businessId, RAW_MOVEMENTS_COLLECTION, context.rawMovements);
  writeLocalCollection(businessId, PRODUCT_MOVEMENTS_COLLECTION, context.productMovements);
};

export const offlineRecipesLocal = {
  async getReferences(businessId: number): Promise<RecipeReferencesResponse> {
    const { products, rawMaterials } = await readContext(businessId);
    return {
      products,
      raw_materials: rawMaterials.filter((entry) => entry.is_active !== false),
    };
  },

  async list(businessId: number, filters?: RecipeFilters): Promise<Recipe[]> {
    const context = await readContext(businessId);
    return sortRecipes(context.recipes)
      .map((recipe) => hydrateRecipe(recipe, context.products, context.rawMaterials, context.consumptions))
      .filter((recipe) => {
        if (!filters?.include_inactive && recipe.is_active === false) return false;
        if (filters?.product_id && Number(recipe.product_id) !== Number(filters.product_id)) return false;
        if (filters?.search) {
          const haystack = [recipe.name, recipe.product_name, recipe.notes].map(normalizeText).join(' ');
          if (!haystack.includes(normalizeText(filters.search))) return false;
        }
        return true;
      });
  },

  async get(businessId: number, recipeId: number): Promise<{ recipe: Recipe; recent_consumptions: RecipeConsumption[] }> {
    const context = await readContext(businessId);
    const recipe = context.recipes.find((entry) => Number(entry.id) === Number(recipeId));
    if (!recipe) {
      throw new Error('No encontramos esta receta en tu espacio local.');
    }

    const hydratedRecipe = hydrateRecipe(recipe, context.products, context.rawMaterials, context.consumptions);
    const recentConsumptions = sortConsumptions(
      context.consumptions.filter((entry) => Number(entry.recipe_id) === Number(recipeId)),
    );

    return {
      recipe: hydratedRecipe,
      recent_consumptions: recentConsumptions,
    };
  },

  async getCosting(businessId: number, recipeId: number): Promise<RecipeCosting> {
    const { recipe } = await this.get(businessId, recipeId);
    return buildCosting(recipe);
  },

  async create(businessId: number, payload: RecipePayload): Promise<Recipe> {
    const context = await readContext(businessId);
    const product = context.products.find((entry) => Number(entry.id) === Number(payload.product_id));
    const timestamp = new Date().toISOString();
    const recipeId = nextLocalNumericId(context.recipes);
    const items = (payload.items || []).map((item, index) => {
      const material = context.rawMaterials.find((entry) => Number(entry.id) === Number(item.raw_material_id));
      return {
        id: index + 1,
        recipe_id: recipeId,
        raw_material_id: Number(item.raw_material_id),
        raw_material_name: material?.name ?? null,
        raw_material_unit: material?.unit ?? null,
        quantity_required: Number(item.quantity_required || 0),
        notes: item.notes?.trim() || null,
        sort_order: item.sort_order ?? index,
        reference_cost: material?.reference_cost ?? null,
      };
    });

    const recipe: Recipe = {
      id: recipeId,
      business_id: businessId,
      product_id: Number(payload.product_id),
      product_name: product?.name ?? null,
      product_type: (product as any)?.type ?? null,
      name: payload.name.trim(),
      notes: payload.notes?.trim() || null,
      is_active: payload.is_active ?? true,
      created_at: timestamp,
      updated_at: timestamp,
      items_count: items.length,
      consumptions_count: 0,
      theoretical_total_cost: Number(items.reduce((sum, item) => sum + Number(item.quantity_required || 0) * Number(item.reference_cost || 0), 0).toFixed(4)),
      items,
    };

    context.recipes = [recipe, ...context.recipes];
    persistContext(businessId, context);
    return hydrateRecipe(recipe, context.products, context.rawMaterials, context.consumptions);
  },

  async update(businessId: number, recipeId: number, payload: RecipePayload): Promise<Recipe> {
    const context = await readContext(businessId);
    const existing = context.recipes.find((entry) => Number(entry.id) === Number(recipeId));
    if (!existing) {
      throw new Error('No encontramos esta receta en tu espacio local.');
    }

    const product = context.products.find((entry) => Number(entry.id) === Number(payload.product_id));
    const items = (payload.items || []).map((item, index) => {
      const material = context.rawMaterials.find((entry) => Number(entry.id) === Number(item.raw_material_id));
      return {
        id: index + 1,
        recipe_id: recipeId,
        raw_material_id: Number(item.raw_material_id),
        raw_material_name: material?.name ?? null,
        raw_material_unit: material?.unit ?? null,
        quantity_required: Number(item.quantity_required || 0),
        notes: item.notes?.trim() || null,
        sort_order: item.sort_order ?? index,
        reference_cost: material?.reference_cost ?? null,
      };
    });

    const updated: Recipe = {
      ...existing,
      product_id: Number(payload.product_id),
      product_name: product?.name ?? existing.product_name ?? null,
      product_type: (product as any)?.type ?? existing.product_type ?? null,
      name: payload.name?.trim() || existing.name,
      notes: payload.notes === undefined ? existing.notes ?? null : payload.notes?.trim() || null,
      is_active: payload.is_active ?? existing.is_active,
      updated_at: new Date().toISOString(),
      items_count: items.length,
      items,
    };

    context.recipes = context.recipes.map((entry) => Number(entry.id) === Number(recipeId) ? updated : entry);
    persistContext(businessId, context);
    return hydrateRecipe(updated, context.products, context.rawMaterials, context.consumptions);
  },

  async deactivate(businessId: number, recipeId: number): Promise<Recipe> {
    const context = await readContext(businessId);
    const existing = context.recipes.find((entry) => Number(entry.id) === Number(recipeId));
    if (!existing) {
      throw new Error('No encontramos esta receta en tu espacio local.');
    }

    const updated: Recipe = {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    context.recipes = context.recipes.map((entry) => Number(entry.id) === Number(recipeId) ? updated : entry);
    persistContext(businessId, context);
    return hydrateRecipe(updated, context.products, context.rawMaterials, context.consumptions);
  },

  async consume(businessId: number, recipeId: number, payload: RecipeConsumptionPayload): Promise<RecipeConsumption> {
    const context = await readContext(businessId);
    const recipe = context.recipes.find((entry) => Number(entry.id) === Number(recipeId));
    if (!recipe) {
      throw buildOfflineValidationError('No encontramos esta receta en tu espacio local.');
    }

    const hydratedRecipe = hydrateRecipe(recipe, context.products, context.rawMaterials, context.consumptions);
    const quantity = Number(payload.quantity_produced_or_sold || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw buildOfflineValidationError('La cantidad a producir debe ser mayor a cero.');
    }

    if (!hydratedRecipe.items.length) {
      throw buildOfflineValidationError('La receta seleccionada no tiene insumos configurados.');
    }

    const shortages = hydratedRecipe.items
      .map((item) => {
        const material = context.rawMaterials.find((entry) => Number(entry.id) === Number(item.raw_material_id));
        if (!material) {
          return {
            raw_material_id: item.raw_material_id,
            raw_material_name: item.raw_material_name || 'Materia prima',
            raw_material_unit: item.raw_material_unit || 'und',
            required_quantity: Number((Number(item.quantity_required || 0) * quantity).toFixed(4)),
            available_stock: 0,
            shortage: Number((Number(item.quantity_required || 0) * quantity).toFixed(4)),
            code: 'RAW_MATERIAL_NOT_FOUND',
          };
        }

        const requiredQuantity = Number((Number(item.quantity_required || 0) * quantity).toFixed(4));
        const availableStock = Number(material.current_stock || 0);
        const shortage = Number((requiredQuantity - availableStock).toFixed(4));
        if (shortage <= 0) {
          return null;
        }

        return {
          raw_material_id: material.id,
          raw_material_name: material.name,
          raw_material_unit: material.unit,
          required_quantity: requiredQuantity,
          available_stock: availableStock,
          shortage,
        };
      })
      .filter(Boolean);

    if (shortages.length > 0) {
      throw buildOfflineValidationError(
        'No puedes registrar la producción porque no hay suficiente inventario de insumos para completar este lote.',
        {
          code: 'INSUFFICIENT_RAW_MATERIALS',
          shortages,
        },
      );
    }

    const timestamp = new Date().toISOString();
    const consumptionId = nextLocalNumericId(context.consumptions);
    const baseMovementId = nextLocalNumericId(context.rawMovements);
    const user = getStoredUser();
    const items = hydratedRecipe.items.map((item, index) => {
      const materialIndex = context.rawMaterials.findIndex((entry) => Number(entry.id) === Number(item.raw_material_id));
      if (materialIndex < 0) {
        throw buildOfflineValidationError(`No encontramos el insumo ${item.raw_material_name || item.raw_material_id} en tu inventario local.`);
      }

      const material = context.rawMaterials[materialIndex];
      const quantityConsumed = Number((Number(item.quantity_required || 0) * quantity).toFixed(4));
      const previousStock = Number(material.current_stock || 0);
      const newStock = Number((previousStock - quantityConsumed).toFixed(4));
      const movementId = baseMovementId + index;

      context.rawMaterials[materialIndex] = {
        ...material,
        current_stock: newStock,
        is_below_minimum: newStock <= Number(material.minimum_stock || 0),
        updated_at: timestamp,
      };

      context.rawMovements.unshift({
        id: movementId,
        raw_material_id: material.id,
        business_id: businessId,
        created_by: Number(user?.id || 0) || null,
        raw_material_name: material.name,
        movement_type: 'out',
        quantity: quantityConsumed,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_cost: material.reference_cost ?? null,
        notes: `Consumo offline de receta: ${hydratedRecipe.name}`,
        created_at: timestamp,
        created_by_name: user?.name || null,
        created_by_role: null,
        raw_purchase_id: null,
        raw_purchase_number: null,
        recipe_consumption_id: consumptionId,
      });

      return {
        id: index + 1,
        recipe_consumption_id: consumptionId,
        raw_material_id: material.id,
        raw_material_name: material.name,
        raw_material_unit: material.unit,
        quantity_consumed: quantityConsumed,
        previous_stock: previousStock,
        new_stock: newStock,
        raw_material_movement_id: movementId,
        created_at: timestamp,
      };
    });

    const consumption: RecipeConsumption = {
      id: consumptionId,
      business_id: businessId,
      recipe_id: hydratedRecipe.id,
      recipe_name: hydratedRecipe.name,
      product_id: hydratedRecipe.product_id,
      product_name: hydratedRecipe.product_name ?? null,
      related_sale_id: null,
      source_type: 'manual',
      quantity_produced_or_sold: quantity,
      notes: payload.notes?.trim() || null,
      created_by: Number(user?.id || 0) || null,
      created_at: timestamp,
      created_by_name: user?.name || null,
      created_by_role: null,
      items_count: items.length,
      items,
    };

    context.consumptions = [consumption, ...context.consumptions];
    persistContext(businessId, context);
    return consumption;
  },

  async registerProduction(businessId: number, productId: number, payload: RegisterProductionPayload): Promise<RegisterProductionResult> {
    const context = await readContext(businessId);
    const product = context.products.find((entry) => Number(entry.id) === Number(productId));
    if (!product) {
      throw buildOfflineValidationError('No encontramos el producto terminado en tu inventario local.');
    }

    if (String(product.type || 'product') !== 'product') {
      throw buildOfflineValidationError('Solo puedes registrar producción para productos terminados.');
    }

    if (String(product.fulfillment_mode || '').trim().toLowerCase() !== 'make_to_stock') {
      throw buildOfflineValidationError('Este producto no está configurado para producción a stock.');
    }

    const recipe = context.recipes.find((entry) => Number(entry.product_id) === Number(productId) && entry.is_active !== false);
    if (!recipe) {
      throw buildOfflineValidationError('No encontramos una receta activa local para este producto.');
    }

    const quantity = Number(payload.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw buildOfflineValidationError('La cantidad a producir debe ser mayor a cero.');
    }

    const consumption = await this.consume(businessId, Number(recipe.id), {
      quantity_produced_or_sold: quantity,
      notes: payload.notes,
    });

    const nextProducts = await offlineSyncService.getProductsFromLocal(businessId);
    const nextProduct = nextProducts.find((entry) => Number(entry.id) === Number(productId));
    if (!nextProduct) {
      throw buildOfflineValidationError('No encontramos el producto terminado después de consumir los insumos localmente.');
    }

    const previousStock = Number(nextProduct.stock || 0);
    const newStock = Number((previousStock + quantity).toFixed(4));
    const updatedProduct = await offlineSyncService.updateOfflineProduct(businessId, productId, { stock: newStock });

    const timestamp = consumption.created_at || new Date().toISOString();
    const user = getStoredUser();
    const refreshedContext = await readContext(businessId);
    const movementId = nextLocalNumericId(refreshedContext.productMovements);
    const productMovement: ProductMovement = {
      id: movementId,
      business_id: businessId,
      product_id: Number(updatedProduct.id),
      product_name: updatedProduct.name,
      type: 'in',
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: payload.notes?.trim() || `Producción offline registrada desde receta: ${recipe.name}`,
      created_at: timestamp,
      created_by_name: user?.name || null,
      created_by_role: undefined,
    };

    refreshedContext.productMovements = [productMovement, ...refreshedContext.productMovements];
    persistContext(businessId, refreshedContext);

    return {
      product: updatedProduct,
      recipe,
      recipe_consumption: consumption,
      product_movement: productMovement,
    };
  },

  async listConsumptions(businessId: number, recipeId: number): Promise<{ recipe: Recipe; consumptions: RecipeConsumption[] }> {
    const detail = await this.get(businessId, recipeId);
    return {
      recipe: detail.recipe,
      consumptions: sortConsumptions(detail.recent_consumptions),
    };
  },

  async getConsumption(businessId: number, consumptionId: number): Promise<RecipeConsumption> {
    const context = await readContext(businessId);
    const consumption = context.consumptions.find((entry) => Number(entry.id) === Number(consumptionId));
    if (!consumption) {
      throw new Error('No encontramos este consumo en tu espacio local.');
    }
    return consumption;
  },
};
