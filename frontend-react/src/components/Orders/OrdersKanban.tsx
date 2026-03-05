import React from 'react';
import { Order } from '../../types';
import { formatCOP, getOrderStatusColor, getOrderStatusLabel } from './helpers';
import { Clock, CheckCircle, XCircle, Trash2, MessageCircle, Copy } from 'lucide-react';

interface OrdersKanbanProps {
  orders: Order[];
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onDelete: (id: number) => void;
}

export const OrdersKanban: React.FC<OrdersKanbanProps> = ({ orders, onView, onUpdateStatus, onDelete }) => {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const renderCard = (order: Order) => (
    <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all mb-3 group cursor-pointer" onClick={() => onView(order)} data-tour="orders.card">
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-gray-900 dark:text-white truncate max-w-[70%]">
            {order.customer_name || 'Cliente Casual'}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
            #{order.id}
        </span>
      </div>
      
      <div className="flex justify-between items-end mb-3">
         <span className="text-sm text-gray-500 dark:text-gray-400">
             {new Date(order.order_date + 'T00:00:00').toLocaleDateString()}
         </span>
        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
            {formatCOP((order.total && order.total > 0 ? order.total : (order.items || []).reduce((s, it) => s + (it.total || (it.quantity * it.unit_price)), 0)))}
        </span>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
         <span className={`text-xs px-2 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
             {getOrderStatusLabel(order.status)}
         </span>
         
         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                title="WhatsApp"
                data-tour="orders.whatsapp"
            >
                <MessageCircle className="w-4 h-4" />
            </button>
            <button
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Duplicar"
                data-tour="orders.duplicate"
            >
                <Copy className="w-4 h-4" />
            </button>
            {order.status === 'pending' && (
                <button 
                  onClick={() => onUpdateStatus(order, 'completed')}
                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                  title="Completar"
                >
                    <CheckCircle className="w-4 h-4" />
                </button>
            )}
            {order.status !== 'cancelled' && (
                <button 
                  onClick={() => onUpdateStatus(order, 'cancelled')}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Cancelar"
                >
                    <XCircle className="w-4 h-4" />
                </button>
            )}
            <button 
               onClick={() => onDelete(order.id)}
               className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
               <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full md:overflow-hidden overflow-y-auto pb-20 md:pb-0">
      {/* Pending Column */}
      <div className="flex flex-col md:h-full h-auto bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shrink-0 md:min-h-0">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" /> Pendientes
            </h3>
            <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200 dark:border-gray-700">
                {pendingOrders.length}
            </span>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:pr-2 md:min-h-0 custom-scrollbar">
            {pendingOrders.map(renderCard)}
            {pendingOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">No hay pedidos pendientes</div>
            )}
        </div>
      </div>

      {/* Completed Column */}
      <div className="flex flex-col md:h-full h-auto bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shrink-0 md:min-h-0">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Completados
            </h3>
            <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200 dark:border-gray-700">
                {completedOrders.length}
            </span>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:pr-2 md:min-h-0 custom-scrollbar">
            {completedOrders.map(renderCard)}
             {completedOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">No hay pedidos completados</div>
            )}
        </div>
      </div>

      {/* Cancelled Column */}
      <div className="flex flex-col md:h-full h-auto bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shrink-0 md:min-h-0">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" /> Cancelados
            </h3>
            <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200 dark:border-gray-700">
                {cancelledOrders.length}
            </span>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:pr-2 md:min-h-0 custom-scrollbar">
            {cancelledOrders.map(renderCard)}
             {cancelledOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">No hay pedidos cancelados</div>
            )}
        </div>
      </div>
    </div>
  );
};
