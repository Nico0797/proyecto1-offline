import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
  );
};
