import { create } from 'zustand';
import api from '../services/api';
import { Product } from '../types';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (businessId: number) => Promise<void>;
  addProduct: (businessId: number, product: Omit<Product, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  updateProduct: (businessId: number, id: number, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (businessId: number, id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  loading: false,
  error: null,
  fetchProducts: async (businessId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ products: [], loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/businesses/${businessId}/products`);
      // Assuming response.data.products is the array. 
      // Need to verify backend response for get_products but standard is usually this.
      set({ products: response.data.products });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addProduct: async (businessId, product) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/products`, product);
      set((state) => ({ products: [...state.products, response.data.product] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateProduct: async (businessId, id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/businesses/${businessId}/products/${id}`, updates);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? response.data.product : p)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteProduct: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/businesses/${businessId}/products/${id}`);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
