import React from 'react';
import { Eye, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Order } from '../../types';
import { DataTableContainer } from '../ui/DataTableContainer';
import { MobileDataCard, MobileDataRow } from '../ui/MobileDataCard';
import { formatCOP, getOrderStatusColor, getOrderStatusLabel } from './helpers';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onDelete: (id: number) => void;
}

const formatOrderDate = (value: string) => new Date(`${value.split('T')[0]}T00:00:00`).toLocaleDateString();

const getOrderTotal = (order: Order) => (
  order.total && order.total > 0
    ? order.total
    : (order.items || []).reduce((sum, item) => sum + (item.total || (item.quantity * item.unit_price)), 0)
);

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, loading, onView, onUpdateStatus, onDelete }) => {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando pedidos...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">No hay pedidos registrados</h3>
        <p className="text-gray-500 dark:text-gray-400">Crea tu primer pedido para comenzar a ver datos.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {orders.map((order) => (
          <MobileDataCard
            key={order.id}
            className="cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => onView(order)}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500">{formatOrderDate(order.order_date)}</div>
                <div className="mt-1 break-words text-base font-semibold text-gray-900 dark:text-white">
                  {order.customer_name || 'Cliente Casual'}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pedido #{order.id}</div>
              </div>
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getOrderStatusColor(order.status)}`}>
                {getOrderStatusLabel(order.status)}
              </span>
            </div>

            <div className="space-y-2.5">
              <MobileDataRow label="Estado" value={getOrderStatusLabel(order.status)} align="end" />
              <MobileDataRow label="Total" value={formatCOP(getOrderTotal(order))} align="end" valueClassName="text-base font-semibold" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onView(order); }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-blue-200 px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                <Eye className="h-4 w-4" />
                Ver
              </button>

              {order.status === 'pending' ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(order, 'completed'); }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-green-200 px-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 dark:border-green-500/30 dark:text-green-300 dark:hover:bg-green-900/20"
                >
                  <CheckCircle className="h-4 w-4" />
                  Completar
                </button>
              ) : null}

              {order.status !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(order, 'cancelled'); }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </button>
              ) : null}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </MobileDataCard>
        ))}
      </div>

      <div className="hidden lg:block">
        <DataTableContainer>
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 font-medium text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {orders.map((order) => (
                <tr key={order.id} className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{order.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">{formatOrderDate(order.order_date)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.customer_name || 'Cliente Casual'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCOP(getOrderTotal(order))}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => onView(order)} className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </button>
                      {order.status === 'pending' ? (
                        <button onClick={() => onUpdateStatus(order, 'completed')} className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20" title="Marcar completado">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                      {order.status !== 'cancelled' ? (
                        <button onClick={() => onUpdateStatus(order, 'cancelled')} className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title="Cancelar">
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button onClick={() => onDelete(order.id)} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableContainer>
      </div>
    </>
  );
};
