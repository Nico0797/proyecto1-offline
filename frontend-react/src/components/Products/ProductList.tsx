import React from 'react';
import { Product } from '../../types';
import { moneyCOP, calcMargin, getStockStatus } from './helpers';
import { Edit2, Copy, Trash2, Package, ShoppingBag } from 'lucide-react';
import { useCategoryStore } from './categoryStore';

interface ProductListProps {
  products: Product[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  onSelectAll: () => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  selectedIds,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { getCategory } = useCategoryStore();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay productos</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Comienza agregando tu primer producto o servicio.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const margin = calcMargin(product.price, product.cost || 0);
        const stockStatus = getStockStatus(product);
        const category = getCategory(product.id);
        const isSelected = selectedIds.includes(product.id);

        return (
          <div 
            key={product.id}
            className={`
              relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all duration-200
              ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'}
            `}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3 z-10">
               <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 h-5 w-5 cursor-pointer"
                checked={isSelected}
                onChange={() => onSelect(product.id)}
              />
            </div>

            {/* Card Content */}
            <div className="p-5 pt-10">
              {/* Icon & Category Badge */}
              <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-xl ${product.type === 'service' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {product.type === 'service' ? <ShoppingBag className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                 </div>
                 {category && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${category.color} text-white opacity-90`}>
                      {category.name}
                    </span>
                 )}
              </div>

              {/* Title & SKU */}
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-1 line-clamp-2" title={product.name}>
                    {product.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {product.sku || 'Sin SKU'}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Precio</p>
                    <p className="font-bold text-gray-900 dark:text-white">{moneyCOP(product.price)}</p>
                 </div>
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Stock</p>
                    {product.type === 'service' ? (
                       <span className="text-blue-600 dark:text-blue-400 font-medium">∞</span>
                    ) : (
                       <span className={`font-bold ${
                           stockStatus === 'out_of_stock' ? 'text-red-600' : 
                           stockStatus === 'low_stock' ? 'text-yellow-600' : 'text-green-600'
                       }`}>
                           {product.stock} {product.unit}
                       </span>
                    )}
                 </div>
              </div>
              
              {/* Margin Bar */}
              {product.type === 'product' && product.cost && (
                  <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Margen</span>
                          <span className={`font-medium ${margin < 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {margin.toFixed(1)}%
                          </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                             className={`h-full ${margin < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                             style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                          />
                      </div>
                  </div>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-1 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={() => onEdit(product)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDuplicate(product)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(product)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Archivar/Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
