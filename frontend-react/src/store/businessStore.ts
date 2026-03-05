import { create } from 'zustand';
import { Business } from '../types';
import api from '../services/api';

// Helper to get initial active business from localStorage
const getInitialActiveBusiness = (): Business | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('activeBusiness');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

interface BusinessState {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoading: boolean;
  error: string | null;
  fetchBusinesses: () => Promise<void>;
  setActiveBusiness: (business: Business) => void;
  addBusiness: (data: Partial<Business>) => Promise<void>;
  updateBusiness: (id: number, data: Partial<Business>) => Promise<void>;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  activeBusiness: getInitialActiveBusiness(),
  isLoading: false,
  error: null,
  fetchBusinesses: async () => {
    // Avoid fetching if no token is present to prevent 401s
    const token = localStorage.getItem('token');
    if (!token) {
      set({ businesses: [], activeBusiness: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/businesses');
      const fetchedBusinesses = response.data.businesses;
      
      const { activeBusiness } = get();
      
      // If there's an active business in localStorage, find it in the fetched list
      let newActiveBusiness = activeBusiness;
      if (!newActiveBusiness && fetchedBusinesses.length > 0) {
        // No active business, set the first one
        newActiveBusiness = fetchedBusinesses[0];
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeBusiness', JSON.stringify(fetchedBusinesses[0]));
        }
      } else if (newActiveBusiness) {
        // Verify the active business still exists in the fetched list
        const exists = fetchedBusinesses.find((b: Business) => b.id === newActiveBusiness!.id);
        if (!exists && fetchedBusinesses.length > 0) {
          // Active business was deleted, fallback to first business
          newActiveBusiness = fetchedBusinesses[0];
          if (typeof window !== 'undefined') {
            localStorage.setItem('activeBusiness', JSON.stringify(fetchedBusinesses[0]));
          }
        }
      }
      
      set({ businesses: fetchedBusinesses, activeBusiness: newActiveBusiness, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 401) {
         // Handle unauthorized silently, maybe clear businesses
         set({ businesses: [], activeBusiness: null, isLoading: false });
         return;
      }
      set({ error: error.message || 'Failed to fetch businesses', isLoading: false });
    }
  },
  setActiveBusiness: (business: Business) => {
    set({ activeBusiness: business, error: null });
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeBusiness', JSON.stringify(business));
    }
  },
  addBusiness: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/businesses', data);
      const newBusiness = response.data.business;
      
      set((state) => ({
        businesses: [...state.businesses, newBusiness],
        activeBusiness: newBusiness, // Automatically set as active
      }));
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeBusiness', JSON.stringify(newBusiness));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to add business' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateBusiness: async (id: number, data: Partial<Business>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/businesses/${id}`, data);
      const updatedBusiness = response.data.business;
      
      set((state) => ({
        businesses: state.businesses.map((b) => (b.id === id ? updatedBusiness : b)),
        activeBusiness: state.activeBusiness?.id === id ? updatedBusiness : state.activeBusiness,
      }));
      
      if (typeof window !== 'undefined' && get().activeBusiness?.id === id) {
        localStorage.setItem('activeBusiness', JSON.stringify(updatedBusiness));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update business' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
