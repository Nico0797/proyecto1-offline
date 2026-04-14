import api from './api';
import { RawMaterial, RawMaterialMovement, RawMaterialMovementType } from '../types';
import { isPureOfflineRuntime, nextLocalNumericId, normalizeText, readLocalCollection, writeLocalCollection } from './offlineLocalData';

export interface RawMaterialFilters {
  search?: string;
  low_stock_only?: boolean;
  include_inactive?: boolean;
}

export interface RawMaterialPayload {
  name: string;
  sku?: string | null;
  unit: string;
  current_stock?: number;
  minimum_stock?: number;
  reference_cost?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface RawMaterialMovementPayload {
  movement_type: RawMaterialMovementType;
  quantity?: number;
  target_stock?: number;
  reference_cost?: number | null;
  notes?: string | null;
}

export interface RawInventoryRequestOptions {
  silenceNotFound?: boolean;
}

const normalizeFilters = (filters?: RawMaterialFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.low_stock_only) params.low_stock_only = true;
  if (filters.include_inactive) params.include_inactive = true;
  return params;
};

const RAW_MATERIALS_COLLECTION = 'raw_materials';
const RAW_MOVEMENTS_COLLECTION = 'raw_material_movements';

const sortMaterials = (materials: RawMaterial[]) => {
  return [...materials].sort((left, right) => normalizeText(left.name).localeCompare(normalizeText(right.name)));
};

const resolveMovementStock = (
  material: RawMaterial,
  payload: RawMaterialMovementPayload,
): { previousStock: number; newStock: number } => {
  const previousStock = Number(material.current_stock || 0);

  if (payload.movement_type === 'adjustment') {
    const newStock = Number(payload.target_stock ?? previousStock);
    return { previousStock, newStock };
  }

  const delta = Number(payload.quantity || 0);
  const signedDelta = payload.movement_type === 'in' ? delta : -delta;
  return {
    previousStock,
    newStock: Number((previousStock + signedDelta).toFixed(4)),
  };
};

export const rawInventoryService = {
  async list(businessId: number, filters?: RawMaterialFilters, options?: RawInventoryRequestOptions): Promise<RawMaterial[]> {
    if (isPureOfflineRuntime()) {
      const materials = sortMaterials(readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION)).filter((material) => {
        if (!filters?.include_inactive && material.is_active === false) return false;
        if (filters?.low_stock_only && !material.is_below_minimum) return false;
        if (filters?.search) {
          const haystack = [material.name, material.sku, material.notes].map(normalizeText).join(' ');
          if (!haystack.includes(normalizeText(filters.search))) return false;
        }
        return true;
      });
      return materials;
    }

    const response = await api.get(`/businesses/${businessId}/raw-materials`, {
      params: normalizeFilters(filters),
      __silent403: Boolean(options?.silenceNotFound),
      __silent404: Boolean(options?.silenceNotFound),
    } as any);
    return response.data?.raw_materials || [];
  },

  async get(businessId: number, materialId: number): Promise<RawMaterial> {
    if (isPureOfflineRuntime()) {
      const material = readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION).find((entry) => entry.id === materialId);
      if (!material) {
        throw new Error('No encontramos esta materia prima en tu espacio local.');
      }
      return material;
    }

    const response = await api.get(`/businesses/${businessId}/raw-materials/${materialId}`);
    return response.data.raw_material;
  },

  async create(businessId: number, payload: RawMaterialPayload): Promise<RawMaterial> {
    if (isPureOfflineRuntime()) {
      const materials = readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION);
      const timestamp = new Date().toISOString();
      const currentStock = Number(payload.current_stock || 0);
      const minimumStock = Number(payload.minimum_stock || 0);
      const material: RawMaterial = {
        id: nextLocalNumericId(materials),
        business_id: businessId,
        name: payload.name.trim(),
        sku: payload.sku?.trim() || null,
        unit: payload.unit.trim(),
        current_stock: currentStock,
        minimum_stock: minimumStock,
        reference_cost: payload.reference_cost ?? null,
        notes: payload.notes?.trim() || null,
        is_active: payload.is_active ?? true,
        is_below_minimum: currentStock <= minimumStock,
        created_at: timestamp,
        updated_at: timestamp,
      };
      writeLocalCollection(businessId, RAW_MATERIALS_COLLECTION, sortMaterials([material, ...materials]));
      return material;
    }

    const response = await api.post(`/businesses/${businessId}/raw-materials`, payload);
    return response.data.raw_material;
  },

  async update(businessId: number, materialId: number, payload: RawMaterialPayload): Promise<RawMaterial> {
    if (isPureOfflineRuntime()) {
      const materials = readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION);
      const existing = materials.find((entry) => entry.id === materialId);
      if (!existing) {
        throw new Error('No encontramos esta materia prima en tu espacio local.');
      }
      const currentStock = payload.current_stock === undefined ? Number(existing.current_stock || 0) : Number(payload.current_stock || 0);
      const minimumStock = payload.minimum_stock === undefined ? Number(existing.minimum_stock || 0) : Number(payload.minimum_stock || 0);
      const updated: RawMaterial = {
        ...existing,
        ...payload,
        name: payload.name?.trim() || existing.name,
        unit: payload.unit?.trim() || existing.unit,
        sku: payload.sku === undefined ? existing.sku ?? null : payload.sku?.trim() || null,
        notes: payload.notes === undefined ? existing.notes ?? null : payload.notes?.trim() || null,
        current_stock: currentStock,
        minimum_stock: minimumStock,
        is_active: payload.is_active ?? existing.is_active,
        is_below_minimum: currentStock <= minimumStock,
        updated_at: new Date().toISOString(),
      };
      writeLocalCollection(
        businessId,
        RAW_MATERIALS_COLLECTION,
        sortMaterials(materials.map((entry) => (entry.id === materialId ? updated : entry))),
      );
      return updated;
    }

    const response = await api.put(`/businesses/${businessId}/raw-materials/${materialId}`, payload);
    return response.data.raw_material;
  },

  async deactivate(businessId: number, materialId: number): Promise<RawMaterial> {
    if (isPureOfflineRuntime()) {
      const material = await this.get(businessId, materialId);
      return this.update(businessId, materialId, {
        name: material.name,
        unit: material.unit,
        sku: material.sku ?? null,
        current_stock: Number(material.current_stock || 0),
        minimum_stock: Number(material.minimum_stock || 0),
        reference_cost: material.reference_cost ?? null,
        notes: material.notes ?? null,
        is_active: false,
      });
    }

    const response = await api.delete(`/businesses/${businessId}/raw-materials/${materialId}`);
    return response.data.raw_material;
  },

  async listMovements(businessId: number, materialId: number, movementType?: RawMaterialMovementType): Promise<{ raw_material: RawMaterial; movements: RawMaterialMovement[] }> {
    if (isPureOfflineRuntime()) {
      const raw_material = await this.get(businessId, materialId);
      const movements = readLocalCollection<RawMaterialMovement>(businessId, RAW_MOVEMENTS_COLLECTION)
        .filter((movement) => movement.raw_material_id === materialId && (!movementType || movement.movement_type === movementType))
        .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime());
      return { raw_material, movements };
    }

    const response = await api.get(`/businesses/${businessId}/raw-materials/${materialId}/movements`, {
      params: movementType ? { movement_type: movementType } : undefined,
    });
    return {
      raw_material: response.data.raw_material,
      movements: response.data.movements || [],
    };
  },

  async createMovement(businessId: number, materialId: number, payload: RawMaterialMovementPayload): Promise<{ raw_material: RawMaterial; movement: RawMaterialMovement }> {
    if (isPureOfflineRuntime()) {
      const materials = readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION);
      const material = materials.find((entry) => entry.id === materialId);
      if (!material) {
        throw new Error('No encontramos esta materia prima en tu espacio local.');
      }

      const movements = readLocalCollection<RawMaterialMovement>(businessId, RAW_MOVEMENTS_COLLECTION);
      const { previousStock, newStock } = resolveMovementStock(material, payload);
      const movement: RawMaterialMovement = {
        id: nextLocalNumericId(movements),
        business_id: businessId,
        raw_material_id: materialId,
        raw_material_name: material.name,
        movement_type: payload.movement_type,
        quantity: payload.movement_type === 'adjustment'
          ? Number((newStock - previousStock).toFixed(4))
          : Number(payload.quantity || 0),
        previous_stock: previousStock,
        new_stock: newStock,
        reference_cost: payload.reference_cost ?? material.reference_cost ?? null,
        notes: payload.notes?.trim() || null,
        created_at: new Date().toISOString(),
      };

      const updatedMaterial: RawMaterial = {
        ...material,
        current_stock: newStock,
        reference_cost: payload.reference_cost ?? material.reference_cost ?? null,
        is_below_minimum: newStock <= Number(material.minimum_stock || 0),
        updated_at: new Date().toISOString(),
      };

      writeLocalCollection(
        businessId,
        RAW_MATERIALS_COLLECTION,
        sortMaterials(materials.map((entry) => (entry.id === materialId ? updatedMaterial : entry))),
      );
      writeLocalCollection(businessId, RAW_MOVEMENTS_COLLECTION, [movement, ...movements]);

      return {
        raw_material: updatedMaterial,
        movement,
      };
    }

    const response = await api.post(`/businesses/${businessId}/raw-materials/${materialId}/movements`, payload);
    return {
      raw_material: response.data.raw_material,
      movement: response.data.movement,
    };
  },
};
