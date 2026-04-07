import React from 'react';
import { Order } from '../../types';
import { Button } from '../ui/Button';
import { X, MessageCircle, Printer, Calendar, User, Copy } from 'lucide-react';
import { formatCOP, buildWhatsAppOrderMessage, getOrderStatusColor, getOrderStatusLabel } from './helpers';
import { useBusinessStore } from '../../store/businessStore';

interface OrderDetailDrawerProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (order: Order, status: string) => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({ order, onClose, onUpdateStatus }) => {
  const { activeBusiness } = useBusinessStore();

  if (!order) return null;

  const handleWhatsApp = () => {
    if (!activeBusiness) return;
    const message = buildWhatsAppOrderMessage(order, activeBusiness.name);
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pedido #{order.id}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
               <Calendar className="w-3 h-3" /> {new Date(order.order_date).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status & Customer */}
          <div className="flex flex-col gap-4">
             <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <User className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Cliente</p>
                      <p className="font-bold text-gray-900 dark:text-white">{order.customer_name || 'Cliente Casual'}</p>
                   </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                </span>
             </div>
          </div>

          {/* Items List */}
          <div>
             <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Productos</h3>
             <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                   <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
                      <tr>
                         <th className="px-4 py-3 text-left">Item</th>
                         <th className="px-4 py-3 text-center">Cant.</th>
                         <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {order.items.map((item, index) => (
                         <tr key={index}>
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{item.name || 'Producto'}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCOP(item.total)}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
             <div className="flex justify-end mt-4">
                <div className="text-right">
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total del Pedido</p>
                   <p className="text-2xl font-black text-gray-900 dark:text-white">
                     {formatCOP((order.total && order.total > 0 ? order.total : (order.items || []).reduce((s, it) => s + (it.total || (it.quantity * it.unit_price)), 0)))}
                   </p>
                </div>
             </div>
          </div>

          {/* Notes */}
          {order.note && (
             <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30">
                <h4 className="text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-2">Notas / Instrucciones</h4>
                <p className="text-sm text-yellow-900 dark:text-yellow-200 leading-relaxed">{order.note}</p>
             </div>
          )}

          {/* Quick Actions (Status Change) */}
          <div>
             <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Cambiar Estado</h3>
             <div className="grid grid-cols-3 gap-2">
                <button 
                   onClick={() => onUpdateStatus(order, 'pending')}
                   className={`p-2 rounded-lg border text-xs font-medium transition-all ${order.status === 'pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800 ring-1 ring-yellow-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50'}`}
                >
                   Pendiente
                </button>
                <button 
                   onClick={() => onUpdateStatus(order, 'completed')}
                   className={`p-2 rounded-lg border text-xs font-medium transition-all ${order.status === 'completed' ? 'bg-green-100 border-green-300 text-green-800 ring-1 ring-green-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50'}`}
                >
                   Completado
                </button>
                <button 
                   onClick={() => onUpdateStatus(order, 'cancelled')}
                   className={`p-2 rounded-lg border text-xs font-medium transition-all ${order.status === 'cancelled' ? 'bg-red-100 border-red-300 text-red-800 ring-1 ring-red-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50'}`}
                >
                   Cancelado
                </button>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
           <Button className="w-full bg-green-600 hover:bg-green-700 text-white border-none" onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-2" /> Enviar Resumen por WhatsApp
           </Button>
           <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handlePrint}>
                 <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button variant="secondary" className="flex-1" disabled>
                 <Copy className="w-4 h-4 mr-2" /> Duplicar
              </Button>
           </div>
        </div>
      </div>
    </>
  );
};
