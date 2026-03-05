import React from 'react';
import { Order } from '../../types';
import { formatCOP, getOrderStatusColor, getOrderStatusLabel } from './helpers';
import { Eye, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onDelete: (id: number) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, loading, onView, onUpdateStatus, onDelete }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Cargando pedidos...</div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay pedidos registrados</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Crea tu primer pedido para comenzar a ver datos.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <tr>
          <th className="px-6 py-4">ID</th>
          <th className="px-6 py-4">Fecha</th>
          <th className="px-6 py-4">Cliente</th>
          <th className="px-6 py-4 text-center">Estado</th>
          <th className="px-6 py-4 text-right">Total</th>
          <th className="px-6 py-4 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                #{order.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                {new Date(order.order_date + 'T00:00:00').toLocaleDateString()}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {order.customer_name || 'Cliente Casual'}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                {formatCOP((order.total && order.total > 0 ? order.total : (order.items || []).reduce((s, it) => s + (it.total || (it.quantity * it.unit_price)), 0)))}
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onView(order)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Ver Detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {order.status === 'pending' && (
                      <button 
                        onClick={() => onUpdateStatus(order, 'completed')}
                        className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Marcar Completado"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                  )}

                  {order.status !== 'cancelled' && (
                      <button 
                        onClick={() => onUpdateStatus(order, 'cancelled')}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                  )}
                  
                  <button 
                    onClick={() => onDelete(order.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  );
};
