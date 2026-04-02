import api from './api';
import { RawMaterial, RawMaterialMovement, RawMaterialMovementType } from '../types';

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

export const rawInventoryService = {
  async list(businessId: number, filters?: RawMaterialFilters, options?: RawInventoryRequestOptions): Promise<RawMaterial[]> {
    const response = await api.get(`/businesses/${businessId}/raw-materials`, {
      params: normalizeFilters(filters),
      __silent403: Boolean(options?.silenceNotFound),
      __silent404: Boolean(options?.silenceNotFound),
    } as any);
    return response.data?.raw_materials || [];
  },

  async get(businessId: number, materialId: number): Promise<RawMaterial> {
    const response = await api.get(`/businesses/${businessId}/raw-materials/${materialId}`);
    return response.data.raw_material;
  },

  async create(businessId: number, payload: RawMaterialPayload): Promise<RawMaterial> {
    const response = await api.post(`/businesses/${businessId}/raw-materials`, payload);
    return response.data.raw_material;
  },

  async update(businessId: number, materialId: number, payload: RawMaterialPayload): Promise<RawMaterial> {
    const response = await api.put(`/businesses/${businessId}/raw-materials/${materialId}`, payload);
    return response.data.raw_material;
  },

  async deactivate(businessId: number, materialId: number): Promise<RawMaterial> {
    const response = await api.delete(`/businesses/${businessId}/raw-materials/${materialId}`);
    return response.data.raw_material;
  },

  async listMovements(businessId: number, materialId: number, movementType?: RawMaterialMovementType): Promise<{ raw_material: RawMaterial; movements: RawMaterialMovement[] }> {
    const response = await api.get(`/businesses/${businessId}/raw-materials/${materialId}/movements`, {
      params: movementType ? { movement_type: movementType } : undefined,
    });
    return {
      raw_material: response.data.raw_material,
      movements: response.data.movements || [],
    };
  },

  async createMovement(businessId: number, materialId: number, payload: RawMaterialMovementPayload): Promise<{ raw_material: RawMaterial; movement: RawMaterialMovement }> {
    const response = await api.post(`/businesses/${businessId}/raw-materials/${materialId}/movements`, payload);
    return {
      raw_material: response.data.raw_material,
      movement: response.data.movement,
    };
  },
};
