import React from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Order } from '../../types';
import { formatCOP } from './helpers';

interface OrdersKpisProps {
  orders: Order[];
  onFilterStatus: (status: string) => void;
}

export const OrdersKpis: React.FC<OrdersKpisProps> = ({ orders, onFilterStatus }) => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const totalValue = orders.reduce((sum, o) => {
    const t = o.total && o.total > 0 ? o.total : (o.items || []).reduce((s, it) => s + (it.total || (it.quantity * it.unit_price)), 0);
    return sum + t;
  }, 0);

  return (
    <>
      {/* Móvil: chips horizontales */}
      <div className="md:hidden mb-4 -mx-1 px-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => onFilterStatus('all')}
            title="Todos"
          >
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Todos
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] border border-blue-200/60 dark:border-blue-700/40">
              {totalOrders}
            </span>
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => onFilterStatus('pending')}
            title="Pendientes"
          >
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            Pend.
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] border border-yellow-200/60 dark:border-yellow-700/40">
              {pendingOrders}
            </span>
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => onFilterStatus('completed')}
            title="Completados"
          >
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            Compl.
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] border border-green-200/60 dark:border-green-700/40">
              {completedOrders}
            </span>
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
            onClick={() => onFilterStatus('cancelled')}
            title="Cancelados"
          >
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            Canc.
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] border border-red-200/60 dark:border-red-700/40">
              {cancelledOrders}
            </span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            {formatCOP(totalValue)}
          </div>
        </div>
      </div>

      {/* Desktop: tarjetas */}
      <div className="hidden md:grid grid-cols-5 gap-4 mb-6">
        <div 
          className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          onClick={() => onFilterStatus('all')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Pedidos</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-yellow-300 dark:hover:border-yellow-700 transition-colors"
          onClick={() => onFilterStatus('pending')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Pendientes</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingOrders}</div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-green-300 dark:hover:border-green-700 transition-colors"
          onClick={() => onFilterStatus('completed')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Completados</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{completedOrders}</div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
          onClick={() => onFilterStatus('cancelled')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Cancelados</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{cancelledOrders}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Valor Total</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCOP(totalValue)}</div>
        </div>
      </div>
    </>
  );
};
