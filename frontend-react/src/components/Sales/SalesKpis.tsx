import React, { useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, AlertCircle, ChevronDown } from 'lucide-react';
import { Sale } from '../../types';
import { formatCOP } from './helpers';

interface SalesKpisProps {
  sales: Sale[];
}

export const SalesKpis: React.FC<SalesKpisProps> = ({ sales }) => {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalCount = sales.length;
  const averageTicket = totalCount > 0 ? totalSales / totalCount : 0;
  const totalReceivables = sales.reduce((sum, sale) => sum + (sale.balance || 0), 0);
  
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: single professional button that reveals KPIs */}
      <div className="md:hidden mb-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-left shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Resumen de Ventas</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCOP(totalSales)}</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile: revealed KPIs */}
      {open && (
        <div className="grid grid-cols-2 gap-2 mb-2 md:hidden">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <ShoppingCart className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">N° Ventas</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{totalCount}</div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Ticket Prom.</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={formatCOP(averageTicket)}>{formatCOP(averageTicket)}</div>
          </div>

          <div className="col-span-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Por Cobrar</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalReceivables)}>{formatCOP(totalReceivables)}</div>
          </div>
        </div>
      )}

      {/* Desktop: compact cards */}
      <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ventas Totales</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalSales)}>
              {formatCOP(totalSales)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">N° Ventas</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              {totalCount}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ticket Prom.</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate" title={formatCOP(averageTicket)}>
              {formatCOP(averageTicket)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Por Cobrar</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalReceivables)}>
              {formatCOP(totalReceivables)}
          </div>
        </div>
      </div>
    </>
  );
};
