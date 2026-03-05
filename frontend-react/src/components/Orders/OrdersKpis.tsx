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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
  );
};
