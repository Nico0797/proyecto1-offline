import React, { useState } from 'react';
import { Product } from '../../types';
import { getStockStatus, getStockStatusColor, moneyCOP } from './helpers';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';

interface InventoryTabProps {
  products: Product[];
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ products }) => {
  const { activeBusiness } = useBusinessStore();
  const { updateProduct } = useProductStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleAdjustStock = async (product: Product, amount: number) => {
    if (!activeBusiness) return;
    setLoadingId(product.id);
    try {
      const newStock = Math.max(0, product.stock + amount);
      await updateProduct(activeBusiness.id, product.id, { stock: newStock });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const productList = products.filter(p => p.type === 'product');

  return (
    <table className="w-full text-left text-sm" data-tour="products.inventory.table">
      <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <tr>
          <th className="px-6 py-4">Producto</th>
          <th className="px-6 py-4 text-center">Stock Actual</th>
          <th className="px-6 py-4 text-center">Estado</th>
          <th className="px-6 py-4 text-right">Valor Total</th>
          <th className="px-6 py-4 text-center" data-tour="products.inventory.quickAdjust">Ajuste Rápido</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {productList.map((product) => {
            const stockStatus = getStockStatus(product);
            const totalValue = (product.cost || 0) * product.stock;

            return (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-lg">
                  {product.stock} <span className="text-xs font-normal text-gray-500">{product.unit}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
                    {stockStatus === 'low_stock' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {stockStatus === 'out_of_stock' ? 'Sin Stock' : stockStatus === 'low_stock' ? 'Bajo Stock' : 'OK'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {moneyCOP(totalValue)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleAdjustStock(product, -1)}
                      disabled={loadingId === product.id || product.stock <= 0}
                      className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(product, 1)}
                      disabled={loadingId === product.id}
                      className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
  );
};
