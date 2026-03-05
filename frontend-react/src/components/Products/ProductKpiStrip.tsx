import React from 'react';
import { Package, ShoppingBag, AlertTriangle, TrendingUp, Archive } from 'lucide-react';
import { Product } from '../../types';

interface ProductKpiStripProps {
  products: Product[];
}

export const ProductKpiStrip: React.FC<ProductKpiStripProps> = ({ products }) => {
  const activeProducts = products.filter(p => p.active && p.type === 'product');
  const activeServices = products.filter(p => p.active && p.type === 'service');
  const lowStock = products.filter(p => p.active && p.type === 'product' && p.stock <= (p.low_stock_threshold || 5));
  const inventoryValue = products.reduce((acc, p) => acc + (p.active && p.type === 'product' ? (p.cost || 0) * p.stock : 0), 0);
  const totalStock = products.reduce((acc, p) => acc + (p.active && p.type === 'product' ? p.stock : 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Package className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Productos</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{activeProducts.length}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Servicios</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{activeServices.length}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Valor Inv.</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white truncate" title={`$${inventoryValue.toLocaleString()}`}>
            ${inventoryValue.toLocaleString()}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
            <Archive className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Stock Total</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{totalStock}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 col-span-2 md:col-span-1 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Stock Bajo</span>
        </div>
        <div className="text-lg font-bold text-red-600 dark:text-red-400">{lowStock.length}</div>
      </div>
    </div>
  );
};
