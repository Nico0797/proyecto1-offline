import { create } from 'zustand';
import { RawMaterial, RawMaterialMovement, RawMaterialMovementType } from '../types';
import {
  rawInventoryService,
  RawMaterialFilters,
  RawMaterialMovementPayload,
  RawMaterialPayload,
} from '../services/rawInventoryService';

interface RawInventoryState {
  materials: RawMaterial[];
  selectedMaterial: RawMaterial | null;
  movements: RawMaterialMovement[];
  loading: boolean;
  saving: boolean;
  loadingMovements: boolean;
  error: string | null;
  fetchMaterials: (businessId: number, filters?: RawMaterialFilters) => Promise<void>;
  fetchMaterial: (businessId: number, materialId: number) => Promise<RawMaterial | null>;
  createMaterial: (businessId: number, payload: RawMaterialPayload) => Promise<RawMaterial>;
  updateMaterial: (businessId: number, materialId: number, payload: RawMaterialPayload) => Promise<RawMaterial>;
  deactivateMaterial: (businessId: number, materialId: number) => Promise<RawMaterial>;
  fetchMovements: (businessId: number, materialId: number, movementType?: RawMaterialMovementType) => Promise<void>;
  createMovement: (businessId: number, materialId: number, payload: RawMaterialMovementPayload) => Promise<{ raw_material: RawMaterial; movement: RawMaterialMovement }>;
  setSelectedMaterial: (material: RawMaterial | null) => void;
  clearMovements: () => void;
}

const upsertMaterial = (materials: RawMaterial[], material: RawMaterial) => {
  const exists = materials.some((item) => item.id === material.id);
  if (!exists) return [material, ...materials];
  return materials.map((item) => (item.id === material.id ? material : item));
};

export const useRawInventoryStore = create<RawInventoryState>((set) => ({
  materials: [],
  selectedMaterial: null,
  movements: [],
  loading: false,
  saving: false,
  loadingMovements: false,
  error: null,

  fetchMaterials: async (businessId, filters) => {
    set({ loading: true, error: null });
    try {
      const materials = await rawInventoryService.list(businessId, filters);
      set({ materials });
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchMaterial: async (businessId, materialId) => {
    set({ loading: true, error: null });
    try {
      const material = await rawInventoryService.get(businessId, materialId);
      set((state) => ({
        selectedMaterial: material,
        materials: upsertMaterial(state.materials, material),
      }));
      return material;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createMaterial: async (businessId, payload) => {
    set({ saving: true, error: null });
    try {
      const material = await rawInventoryService.create(businessId, payload);
      set((state) => ({
        materials: [material, ...state.materials],
        selectedMaterial: material,
      }));
      return material;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  updateMaterial: async (businessId, materialId, payload) => {
    set({ saving: true, error: null });
    try {
      const material = await rawInventoryService.update(businessId, materialId, payload);
      set((state) => ({
        materials: upsertMaterial(state.materials, material),
        selectedMaterial: state.selectedMaterial?.id === material.id ? material : state.selectedMaterial,
      }));
      return material;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  deactivateMaterial: async (businessId, materialId) => {
    set({ saving: true, error: null });
    try {
      const material = await rawInventoryService.deactivate(businessId, materialId);
      set((state) => ({
        materials: upsertMaterial(state.materials, material),
        selectedMaterial: state.selectedMaterial?.id === material.id ? material : state.selectedMaterial,
      }));
      return material;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  fetchMovements: async (businessId, materialId, movementType) => {
    set({ loadingMovements: true, error: null });
    try {
      const result = await rawInventoryService.listMovements(businessId, materialId, movementType);
      set((state) => ({
        movements: result.movements,
        selectedMaterial: result.raw_material,
        materials: upsertMaterial(state.materials, result.raw_material),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    } finally {
      set({ loadingMovements: false });
    }
  },

  createMovement: async (businessId, materialId, payload) => {
    set({ saving: true, error: null });
    try {
      const result = await rawInventoryService.createMovement(businessId, materialId, payload);
      set((state) => ({
        selectedMaterial: result.raw_material,
        materials: upsertMaterial(state.materials, result.raw_material),
        movements: [result.movement, ...state.movements],
      }));
      return result;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ saving: false });
    }
  },

  setSelectedMaterial: (material) => set({ selectedMaterial: material }),
  clearMovements: () => set({ movements: [] }),
}));
