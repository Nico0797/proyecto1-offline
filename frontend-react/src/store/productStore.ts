import { create } from 'zustand';
import api from '../services/api';
import { Product } from '../types';
import { offlineSyncService } from '../services/offlineSyncService';

type ProductMutationResult = {
  persisted: boolean;
  source: 'server' | 'offline';
  product?: Product;
};

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: (businessId: number) => Promise<void>;
  addProduct: (businessId: number, product: Omit<Product, 'id' | 'business_id' | 'created_at'>) => Promise<ProductMutationResult>;
  updateProduct: (businessId: number, id: number, updates: Partial<Product>) => Promise<ProductMutationResult>;
  deleteProduct: (businessId: number, id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
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
      const products = response.data.products || [];
      await offlineSyncService.cacheProducts(businessId, products);
      const localProducts = await offlineSyncService.getProductsFromLocal(businessId);
      set({ products: localProducts.length > 0 ? localProducts : products });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const products = await offlineSyncService.getProductsFromLocal(businessId);
        set({ products, error: null });
        return;
      }

      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addProduct: async (businessId, product) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/businesses/${businessId}/products`, product);
      if (!response.data?.product) {
        const validationError = new Error(response.data?.error || 'No se pudo crear el producto') as Error & { response?: { data?: Record<string, any> } };
        validationError.response = { data: response.data };
        throw validationError;
      }

      if (response.data?.preview) {
        const previewProduct = response.data.product as Product;
        set((state) => ({
          products: [...state.products.filter((item) => item.id !== previewProduct.id), previewProduct],
          error: null,
        }));
        return {
          persisted: false,
          source: 'offline',
          product: previewProduct,
        };
      }

      const savedProduct = response.data.product as Product;
      const nextProducts = [
        ...get().products.filter((item) => item.id !== savedProduct.id),
        savedProduct,
      ];
      set({ products: nextProducts, error: null });
      try {
        await offlineSyncService.cacheProducts(businessId, nextProducts);
      } catch {}
      try {
        await get().fetchProducts(businessId);
      } catch {}
      return {
        persisted: true,
        source: 'server',
        product: savedProduct,
      };
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineProduct = await offlineSyncService.createOfflineProduct(businessId, product as Record<string, any>);
        const localProducts = await offlineSyncService.getProductsFromLocal(businessId);
        set({
          products: localProducts.length > 0
            ? localProducts
            : [...get().products.filter((item) => item.id !== offlineProduct.id), offlineProduct],
          error: null,
        });
        return {
          persisted: false,
          source: 'offline',
          product: offlineProduct,
        };
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateProduct: async (businessId, id, updates) => {
    set({ loading: true, error: null });
    try {
      console.info('[productStore.updateProduct] request', {
        businessId,
        productId: id,
        fulfillment_mode: (updates as Partial<Product>)?.fulfillment_mode,
        type: (updates as Partial<Product>)?.type,
        updates,
      });
      const response = await api.put(`/businesses/${businessId}/products/${id}`, updates);
      if (!response.data?.product) {
        const validationError = new Error(response.data?.error || 'No se pudo actualizar el producto') as Error & { response?: { data?: Record<string, any> } };
        validationError.response = { data: response.data };
        throw validationError;
      }

      console.info('[productStore.updateProduct] response', {
        businessId,
        productId: id,
        fulfillment_mode: response.data?.product?.fulfillment_mode,
        product: response.data?.product,
      });

      if (response.data?.preview) {
        const previewProduct = response.data.product as Product;
        set((state) => ({
          products: state.products.map((item) => (item.id === id ? { ...item, ...previewProduct } : item)),
          error: null,
        }));
        return {
          persisted: false,
          source: 'offline',
          product: previewProduct,
        };
      }

      const savedProduct = response.data.product as Product;
      const nextProducts = get().products.map((item) => (item.id === id ? { ...item, ...savedProduct } : item));
      set({ products: nextProducts, error: null });
      try {
        await offlineSyncService.cacheProducts(businessId, nextProducts);
      } catch {}
      try {
        await get().fetchProducts(businessId);
      } catch {}
      return {
        persisted: true,
        source: 'server',
        product: savedProduct,
      };
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineProduct = await offlineSyncService.updateOfflineProduct(businessId, id, updates as Record<string, any>);
        const localProducts = await offlineSyncService.getProductsFromLocal(businessId);
        set({ products: localProducts, error: null });
        return {
          persisted: false,
          source: 'offline',
          product: offlineProduct,
        };
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteProduct: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.delete(`/businesses/${businessId}/products/${id}`);
      if (!response.data?.ok) {
        const validationError = new Error(response.data?.error || 'No se pudo eliminar el producto') as Error & { response?: { data?: Record<string, any> } };
        validationError.response = { data: response.data };
        throw validationError;
      }
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.deleteOfflineProduct(businessId, id);
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
          error: null,
        }));
        return;
      }

      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
