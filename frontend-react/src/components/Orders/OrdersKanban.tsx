import React from 'react';
import { Order } from '../../types';
import { formatCOP, getOrderStatusColor, getOrderStatusLabel } from './helpers';
import { Clock, CheckCircle, XCircle, Trash2, MessageCircle, Copy, Loader2, Circle } from 'lucide-react';
import { useOrderSettings } from '../../store/orderSettingsStore';

interface OrdersKanbanProps {
  orders: Order[];
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onDelete: (id: number) => void;
  singleColumn?: boolean;
}

export const OrdersKanban: React.FC<OrdersKanbanProps> = ({ orders, onView, onUpdateStatus, onDelete, singleColumn = false }) => {
  const { columns } = useOrderSettings();

  const getIcon = (id: string) => {
    switch (id) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 text-blue-500" />;
      default: return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const col = columns.find(c => c.id === status);
    return col ? col.label : getOrderStatusLabel(status);
  };

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
             {getStatusLabel(order.status)}
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

  const visibleColumns = columns.filter(col => col.visible);

  if (singleColumn) {
    return (
      <div className="h-full flex flex-col gap-3 pb-24">
        {orders.map(renderCard)}
        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm italic flex flex-col items-center justify-center h-full">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-3">
               <Circle className="w-8 h-8 text-gray-300" />
            </div>
            No hay pedidos en esta categoría
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[65vh] gap-4 overflow-x-auto pb-24 md:pb-4 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
      {visibleColumns.map((col) => {
        const colOrders = orders.filter(o => o.status === col.id);
        
        return (
          <div key={col.id} className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shrink-0 w-[85vw] md:w-[320px] lg:w-[350px] snap-center">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                {getIcon(col.id)} {col.label}
              </h3>
              <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200 dark:border-gray-700">
                {colOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 pb-16 md:pb-0 touch-pan-y">
              {colOrders.map(renderCard)}
              {colOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm italic">No hay pedidos en {col.label}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
