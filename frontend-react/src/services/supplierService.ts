import api from './api';
import { Supplier } from '../types';
import { isPureOfflineRuntime, nextLocalNumericId, normalizeText, readLocalCollection, writeLocalCollection } from './offlineLocalData';

export interface SupplierFilters {
  search?: string;
  include_inactive?: boolean;
}

export interface SupplierPayload {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

const normalizeFilters = (filters?: SupplierFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.include_inactive) params.include_inactive = true;
  return params;
};

const SUPPLIERS_COLLECTION = 'suppliers';

const sortSuppliers = (suppliers: Supplier[]) => {
  return [...suppliers].sort((left, right) => normalizeText(left.name).localeCompare(normalizeText(right.name)));
};

export const supplierService = {
  async list(businessId: number, filters?: SupplierFilters): Promise<Supplier[]> {
    if (isPureOfflineRuntime()) {
      return sortSuppliers(readLocalCollection<Supplier>(businessId, SUPPLIERS_COLLECTION)).filter((supplier) => {
        if (!filters?.include_inactive && supplier.is_active === false) return false;
        if (filters?.search) {
          const haystack = [supplier.name, supplier.contact_name, supplier.phone, supplier.email, supplier.notes]
            .map(normalizeText)
            .join(' ');
          if (!haystack.includes(normalizeText(filters.search))) return false;
        }
        return true;
      });
    }

    const response = await api.get(`/businesses/${businessId}/suppliers`, {
      params: normalizeFilters(filters),
    });
    return response.data?.suppliers || [];
  },

  async get(businessId: number, supplierId: number): Promise<Supplier> {
    if (isPureOfflineRuntime()) {
      const supplier = readLocalCollection<Supplier>(businessId, SUPPLIERS_COLLECTION).find((entry) => entry.id === supplierId);
      if (!supplier) {
        throw new Error('No encontramos este proveedor en tu espacio local.');
      }
      return supplier;
    }

    const response = await api.get(`/businesses/${businessId}/suppliers/${supplierId}`);
    return response.data.supplier;
  },

  async create(businessId: number, payload: SupplierPayload): Promise<Supplier> {
    if (isPureOfflineRuntime()) {
      const suppliers = readLocalCollection<Supplier>(businessId, SUPPLIERS_COLLECTION);
      const timestamp = new Date().toISOString();
      const supplier: Supplier = {
        id: nextLocalNumericId(suppliers),
        business_id: businessId,
        name: payload.name.trim(),
        contact_name: payload.contact_name?.trim() || null,
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        notes: payload.notes?.trim() || null,
        is_active: payload.is_active ?? true,
        created_at: timestamp,
        updated_at: timestamp,
      };
      writeLocalCollection(businessId, SUPPLIERS_COLLECTION, sortSuppliers([supplier, ...suppliers]));
      return supplier;
    }

    const response = await api.post(`/businesses/${businessId}/suppliers`, payload);
    return response.data.supplier;
  },

  async update(businessId: number, supplierId: number, payload: SupplierPayload): Promise<Supplier> {
    if (isPureOfflineRuntime()) {
      const suppliers = readLocalCollection<Supplier>(businessId, SUPPLIERS_COLLECTION);
      const existing = suppliers.find((entry) => entry.id === supplierId);
      if (!existing) {
        throw new Error('No encontramos este proveedor en tu espacio local.');
      }
      const updated: Supplier = {
        ...existing,
        ...payload,
        name: payload.name?.trim() || existing.name,
        contact_name: payload.contact_name === undefined ? existing.contact_name ?? null : payload.contact_name?.trim() || null,
        phone: payload.phone === undefined ? existing.phone ?? null : payload.phone?.trim() || null,
        email: payload.email === undefined ? existing.email ?? null : payload.email?.trim() || null,
        notes: payload.notes === undefined ? existing.notes ?? null : payload.notes?.trim() || null,
        is_active: payload.is_active ?? existing.is_active,
        updated_at: new Date().toISOString(),
      };
      writeLocalCollection(
        businessId,
        SUPPLIERS_COLLECTION,
        sortSuppliers(suppliers.map((entry) => (entry.id === supplierId ? updated : entry))),
      );
      return updated;
    }

    const response = await api.put(`/businesses/${businessId}/suppliers/${supplierId}`, payload);
    return response.data.supplier;
  },

  async deactivate(businessId: number, supplierId: number): Promise<Supplier> {
    if (isPureOfflineRuntime()) {
      const supplier = await this.get(businessId, supplierId);
      return this.update(businessId, supplierId, {
        name: supplier.name,
        contact_name: supplier.contact_name ?? null,
        phone: supplier.phone ?? null,
        email: supplier.email ?? null,
        notes: supplier.notes ?? null,
        is_active: false,
      });
    }

    const response = await api.delete(`/businesses/${businessId}/suppliers/${supplierId}`);
    return response.data.supplier;
  },
};
