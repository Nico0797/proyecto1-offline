import api from '../services/api';
import { offlineSyncService } from '../services/offlineSyncService';
import { hasOfflineSessionSeed } from '../services/offlineSession';
import type { Product } from '../types';

export type ProductMutationResult = {
  persisted: boolean;
  source: 'server' | 'offline';
  product?: Product;
};

const shouldUseLocalOnly = () => !localStorage.getItem('token') && hasOfflineSessionSeed();

export const productRepository = {
  async list(businessId: number): Promise<Product[]> {
    if (shouldUseLocalOnly()) {
      return offlineSyncService.getProductsFromLocal(businessId);
    }

    try {
      const response = await api.get(`/businesses/${businessId}/products`);
      const products = response.data.products || [];
      await offlineSyncService.cacheProducts(businessId, products);
      const localProducts = await offlineSyncService.getProductsFromLocal(businessId);
      return localProducts.length > 0 ? localProducts : products;
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        return offlineSyncService.getProductsFromLocal(businessId);
      }
      throw error;
    }
  },

  async create(
    businessId: number,
    product: Omit<Product, 'id' | 'business_id' | 'created_at'>
  ): Promise<ProductMutationResult> {
    if (shouldUseLocalOnly()) {
      const offlineProduct = await offlineSyncService.createOfflineProduct(businessId, product as Record<string, any>);
      return { persisted: false, source: 'offline', product: offlineProduct };
    }

    try {
      const response = await api.post(`/businesses/${businessId}/products`, product);
      if (!response.data?.product) {
        const validationError = new Error(response.data?.error || 'No se pudo crear el producto') as Error & {
          response?: { data?: Record<string, any> };
        };
        validationError.response = { data: response.data };
        throw validationError;
      }

      const savedProduct = response.data.product as Product;
      return {
        persisted: !response.data?.preview,
        source: response.data?.preview ? 'offline' : 'server',
        product: savedProduct,
      };
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineProduct = await offlineSyncService.createOfflineProduct(businessId, product as Record<string, any>);
        return { persisted: false, source: 'offline', product: offlineProduct };
      }
      throw error;
    }
  },

  async update(businessId: number, productId: number, updates: Partial<Product>): Promise<ProductMutationResult> {
    if (shouldUseLocalOnly()) {
      const offlineProduct = await offlineSyncService.updateOfflineProduct(businessId, productId, updates as Record<string, any>);
      return { persisted: false, source: 'offline', product: offlineProduct };
    }

    try {
      const response = await api.put(`/businesses/${businessId}/products/${productId}`, updates);
      if (!response.data?.product) {
        const validationError = new Error(response.data?.error || 'No se pudo actualizar el producto') as Error & {
          response?: { data?: Record<string, any> };
        };
        validationError.response = { data: response.data };
        throw validationError;
      }

      const savedProduct = response.data.product as Product;
      return {
        persisted: !response.data?.preview,
        source: response.data?.preview ? 'offline' : 'server',
        product: savedProduct,
      };
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        const offlineProduct = await offlineSyncService.updateOfflineProduct(businessId, productId, updates as Record<string, any>);
        return { persisted: false, source: 'offline', product: offlineProduct };
      }
      throw error;
    }
  },

  async remove(businessId: number, productId: number): Promise<void> {
    if (shouldUseLocalOnly()) {
      await offlineSyncService.deleteOfflineProduct(businessId, productId);
      return;
    }

    try {
      const response = await api.delete(`/businesses/${businessId}/products/${productId}`);
      if (!response.data?.ok) {
        const validationError = new Error(response.data?.error || 'No se pudo eliminar el producto') as Error & {
          response?: { data?: Record<string, any> };
        };
        validationError.response = { data: response.data };
        throw validationError;
      }
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        await offlineSyncService.deleteOfflineProduct(businessId, productId);
        return;
      }
      throw error;
    }
  },
};
