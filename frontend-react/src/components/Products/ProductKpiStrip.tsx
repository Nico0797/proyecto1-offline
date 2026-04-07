import React, { useState } from 'react';
import { Package, ShoppingBag, AlertTriangle, TrendingUp, Archive, ChevronDown } from 'lucide-react';
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

  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile View - Chip Button */}
      <div className="md:hidden mb-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="app-soft-surface w-full flex items-center justify-between px-3 py-2 text-left shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Resumen de Inventario</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{activeProducts.length} Productos</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile: revealed KPIs */}
      {open && (
        <div className="grid grid-cols-2 gap-2 mb-2 md:hidden">
           <div className="app-soft-surface flex items-center justify-between rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <ShoppingBag className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Servicios</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{activeServices.length}</div>
          </div>

          <div className="app-soft-surface flex items-center justify-between rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <TrendingUp className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Valor Inv.</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={`$${inventoryValue.toLocaleString()}`}>${inventoryValue.toLocaleString()}</div>
          </div>

          <div className="app-soft-surface flex items-center justify-between rounded-lg p-2">
             <div className="flex items-center gap-2">
              <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <Archive className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Stock Total</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{totalStock}</div>
          </div>

           <div className="app-soft-surface flex items-center justify-between rounded-lg p-2">
             <div className="flex items-center gap-2">
              <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Stock Bajo</span>
            </div>
            <div className="text-xs font-bold text-red-600 dark:text-red-400">{lowStock.length}</div>
          </div>
        </div>
      )}

      {/* Desktop View - Cards */}
      <div className="hidden md:grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-2 md:mb-6">
        <div className="app-surface p-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Productos</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{activeProducts.length}</div>
        </div>

        <div className="app-surface p-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Servicios</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{activeServices.length}</div>
        </div>

        <div className="app-surface p-3 rounded-xl shadow-sm">
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

        <div className="app-surface p-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
              <Archive className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Stock Total</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{totalStock}</div>
        </div>

        <div className="app-surface p-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Stock Bajo</span>
          </div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{lowStock.length}</div>
        </div>
      </div>
    </>
  );
};
