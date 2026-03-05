import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Product } from '../../types';
import { useCategoryStore } from './categoryStore';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';
import { Layers, DollarSign, Info, AlertTriangle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  onSuccess: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onSuccess }) => {
  const { activeBusiness } = useBusinessStore();
  const { products, addProduct, updateProduct } = useProductStore();
  const { categories, getCategory, assignCategory, addCategory } = useCategoryStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'product' as 'product' | 'service',
    sku: '',
    price: 0,
    cost: 0,
    unit: 'unidad',
    stock: 0,
    low_stock_threshold: 5,
    active: true,
    categoryId: '',
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'price' | 'inventory'>('basic');
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    if (product) {
      const category = getCategory(product.id);
      setFormData({
        name: product.name,
        description: product.description || '',
        type: product.type,
        sku: product.sku || '',
        price: product.price,
        cost: product.cost || 0,
        unit: product.unit,
        stock: product.stock,
        low_stock_threshold: product.low_stock_threshold || 5,
        active: product.active,
        categoryId: category?.id || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'product',
        sku: '',
        price: 0,
        cost: 0,
        unit: 'unidad',
        stock: 0,
        low_stock_threshold: 5,
        active: true,
        categoryId: '',
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        sku: formData.sku,
        price: Number(formData.price),
        cost: Number(formData.cost),
        unit: formData.unit,
        stock: Number(formData.stock),
        low_stock_threshold: Number(formData.low_stock_threshold),
        active: formData.active,
      };

      let productId = product?.id;

      if (product) {
        await updateProduct(activeBusiness.id, product.id, productData);
      } else {
        // Since addProduct returns void in the store but updates the state, we can't get the ID easily unless the store returns it.
        // For now, let's assume we can't assign category immediately for new products if store doesn't return ID.
        // BUT, looking at productStore.ts:
        // const response = await api.post(...)
        // set((state) => ({ products: [...state.products, response.data.product] }));
        // It doesn't return the product. I might need to refactor the store or just fetch products again.
        // Wait, I can modify the store to return the product. But user said "No romper CRUD actual".
        // I will just execute the addProduct.
        await addProduct(activeBusiness.id, productData);
        if (formData.categoryId) {
          const created = [...products].reverse().find(p => p.name === formData.name && p.sku === formData.sku && p.active === true);
          if (created) {
            assignCategory(created.id, formData.categoryId);
          }
        }
      }

      // If we have an ID (edit mode), we can assign category.
      // If create mode, we might miss assigning category unless we find the new product.
      // For now, let's just handle category for edit or if we can find it.
      
      if (productId && formData.categoryId) {
          assignCategory(productId, formData.categoryId);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const margin = formData.price > 0 ? ((formData.price - formData.cost) / formData.price) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Editar Producto' : 'Nuevo Producto'} className="max-w-2xl">
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basic' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('basic')}
          >
            Básico
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'price' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('price')}
          >
            Precios
          </button>
          {formData.type === 'product' && (
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              onClick={() => setActiveTab('inventory')}
            >
              Inventario
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[60vh] px-1">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'product' | 'service' })}
                  >
                    <option value="product">Producto</option>
                    <option value="service">Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría (Local)</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    {addingCat ? (
                      <>
                        <input
                          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                          placeholder="Nueva categoría"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (!newCatName.trim()) return;
                            addCategory(newCatName.trim(), 'bg-gray-500');
                            setAddingCat(false);
                            setNewCatName('');
                            const last = [...categories].reverse().find(c => c.name === newCatName.trim());
                            if (last) {
                              setFormData({ ...formData, categoryId: last.id });
                            }
                          }}
                        >
                          Añadir
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingCat(false); setNewCatName(''); }}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setAddingCat(true)}>
                        + Nueva categoría
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Input
                label="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej. Camiseta Polo"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU (Código)"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Ej. POL-001"
                />
                <Input
                  label="Unidad"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Ej. unidad, kg, litro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles del producto..."
                />
              </div>
            </div>
          )}

          {activeTab === 'price' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Precio de Venta"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  icon={DollarSign}
                />
                <Input
                  label="Costo (Opcional)"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  min="0"
                  icon={DollarSign}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Margen de Ganancia</span>
                  <span className={`text-lg font-bold ${margin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full ${margin < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                  />
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Ganancia por unidad: ${(formData.price - formData.cost).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Stock Actual"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  icon={Layers}
                />
                <Input
                  label="Alerta de Stock Bajo"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseFloat(e.target.value) || 0 })}
                  min="0"
                  icon={AlertTriangle}
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Info className="w-5 h-5 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  El sistema te notificará cuando el stock sea igual o menor al umbral establecido.
                </p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading}>
              {product ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
