import { create } from 'zustand';
import { Product } from '../types';
import { offlineSyncService } from '../services/offlineSyncService';
import { productRepository, type ProductMutationResult } from '../repositories/productRepository';

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
    set({ loading: true, error: null });
    try {
      const products = await productRepository.list(businessId);
      set({ products });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  addProduct: async (businessId, product) => {
    set({ loading: true, error: null });
    try {
      const result = await productRepository.create(businessId, product);
      const savedProduct = result.product as Product;
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
      return result;
    } catch (error: any) {
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
      const result = await productRepository.update(businessId, id, updates);
      const savedProduct = result.product as Product;
      console.info('[productStore.updateProduct] response', {
        businessId,
        productId: id,
        fulfillment_mode: savedProduct?.fulfillment_mode,
        product: savedProduct,
      });
      const nextProducts = get().products.map((item) => (item.id === id ? { ...item, ...savedProduct } : item));
      set({ products: nextProducts, error: null });
      try {
        await offlineSyncService.cacheProducts(businessId, nextProducts);
      } catch {}
      try {
        await get().fetchProducts(businessId);
      } catch {}
      return result;
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteProduct: async (businessId, id) => {
    set({ loading: true, error: null });
    try {
      await productRepository.remove(businessId, id);
      set((state) => ({
        products: state.products.filter((product) => product.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
