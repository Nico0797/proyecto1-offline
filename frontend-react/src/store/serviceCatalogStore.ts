import { create } from 'zustand';
import type { ServiceItem } from '../types';
import { offlineServicesLocal } from '../services/offlineAgendaLocal';

interface ServiceCatalogState {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
  fetchServices: (businessId: number) => void;
  createService: (businessId: number, data: Partial<ServiceItem>) => ServiceItem;
  updateService: (businessId: number, id: number, data: Partial<ServiceItem>) => ServiceItem;
  removeService: (businessId: number, id: number) => void;
}

export const useServiceCatalogStore = create<ServiceCatalogState>((set) => ({
  services: [],
  loading: false,
  error: null,
  fetchServices: (businessId) => {
    set({ loading: true, error: null });
    try {
      const services = offlineServicesLocal.list(businessId);
      set({ services, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  createService: (businessId, data) => {
    const service = offlineServicesLocal.create(businessId, data);
    set((state) => ({ services: [service, ...state.services] }));
    return service;
  },
  updateService: (businessId, id, data) => {
    const updated = offlineServicesLocal.update(businessId, id, data);
    set((state) => ({ services: state.services.map((s) => (s.id === id ? updated : s)) }));
    return updated;
  },
  removeService: (businessId, id) => {
    offlineServicesLocal.remove(businessId, id);
    set((state) => ({ services: state.services.filter((s) => s.id !== id) }));
  },
}));
