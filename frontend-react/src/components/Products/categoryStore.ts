import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CategoryState {
  categories: { id: string; name: string; color: string }[];
  productCategories: Record<number, string>; // productId -> categoryId
  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, name: string, color: string) => void;
  deleteCategory: (id: string) => void;
  assignCategory: (productId: number, categoryId: string) => void;
  getCategory: (productId: number) => { id: string; name: string; color: string } | undefined;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      // Sin categorías predefinidas; el usuario crea desde cero
      categories: [],
      productCategories: {},
      addCategory: (name, color) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { id: Math.random().toString(36).substr(2, 9), name, color },
          ],
        })),
      updateCategory: (id, name, color) =>
        set((state) => ({
          categories: state.categories.map((c) => 
            c.id === id ? { ...c, name, color } : c
          ),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),
      assignCategory: (productId, categoryId) =>
        set((state) => ({
          productCategories: { ...state.productCategories, [productId]: categoryId },
        })),
      getCategory: (productId) => {
        const state = get();
        const catId = state.productCategories[productId];
        return state.categories.find((c) => c.id === catId);
      },
    }),
    {
      name: 'product-categories',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // Migración: eliminar categorías prediseñadas si existen
        if (version < 2 && persistedState?.categories) {
          const cats = persistedState.categories as Array<{ id: string; name: string }>;
          const hasDefaults =
            Array.isArray(cats) &&
            cats.length >= 3 &&
            cats.some((c) => c.id === 'default' || c.name === 'General') &&
            cats.some((c) => c.id === 'food' || c.name === 'Alimentos') &&
            cats.some((c) => c.id === 'electronics' || c.name === 'Electrónica');
          if (hasDefaults) {
            return { ...persistedState, categories: [] };
          }
        }
        return persistedState;
      },
    }
  )
);
