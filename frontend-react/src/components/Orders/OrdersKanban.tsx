import React from 'react';
import { Order } from '../../types';
import { formatCOP, getOrderStatusColor, getOrderStatusLabel } from './helpers';
import { Clock, CheckCircle, XCircle, Trash2, MessageCircle, Copy, Loader2, Circle, EyeOff, LayoutGrid } from 'lucide-react';
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
  const [hideEmptyColumns, setHideEmptyColumns] = React.useState(true);

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

  const getColumnTone = (color?: string) => {
    switch (color) {
      case 'yellow':
        return {
          surface: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-amber-100/70 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-gray-900 dark:to-amber-900/10',
          icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
          badge: 'border-amber-200 bg-amber-100/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300',
          empty: 'border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/35 dark:bg-amber-950/10 dark:text-amber-300',
        };
      case 'blue':
        return {
          surface: 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-blue-100/70 dark:border-blue-900/40 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-900/10',
          icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
          badge: 'border-blue-200 bg-blue-100/90 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-300',
          empty: 'border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-900/35 dark:bg-blue-950/10 dark:text-blue-300',
        };
      case 'green':
        return {
          surface: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-900/10',
          icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          badge: 'border-emerald-200 bg-emerald-100/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300',
          empty: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/35 dark:bg-emerald-950/10 dark:text-emerald-300',
        };
      case 'red':
        return {
          surface: 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-rose-100/70 dark:border-rose-900/40 dark:from-rose-950/20 dark:via-gray-900 dark:to-rose-900/10',
          icon: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
          badge: 'border-rose-200 bg-rose-100/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-300',
          empty: 'border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-900/35 dark:bg-rose-950/10 dark:text-rose-300',
        };
      default:
        return {
          surface: 'border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100/70 dark:border-gray-700 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/70',
          icon: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
          badge: 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
          empty: 'border-gray-200 bg-gray-50/80 text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400',
        };
    }
  };

  const visibleColumns = columns.filter((col) => col.visible);
  const columnsWithOrders = visibleColumns.map((col) => ({
    ...col,
    orders: orders.filter((order) => order.status === col.id),
  }));
  const populatedColumns = columnsWithOrders.filter((col) => col.orders.length > 0);
  const displayColumns = hideEmptyColumns ? populatedColumns : columnsWithOrders;
  const hiddenEmptyCount = columnsWithOrders.length - populatedColumns.length;

  const renderCard = (order: Order) => (
    <div
      key={order.id}
      className="group mb-3 cursor-pointer rounded-[22px] border border-gray-200/90 bg-gradient-to-br from-white via-white to-blue-50/60 p-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-28px_rgba(37,99,235,0.28)] dark:border-gray-700 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900"
      onClick={() => onView(order)}
      data-tour="orders.card"
    >
      <div className="mb-2 flex justify-between gap-3">
        <span className="max-w-[70%] truncate text-sm font-semibold text-gray-900 dark:text-white">
          {order.customer_name || 'Cliente Casual'}
        </span>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          #{order.id}
        </span>
      </div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Fecha
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {new Date(order.order_date + 'T00:00:00').toLocaleDateString()}
          </div>
        </div>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {formatCOP((order.total && order.total > 0 ? order.total : (order.items || []).reduce((s, it) => s + (it.total || (it.quantity * it.unit_price)), 0)))}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-gray-50/80 px-3 py-2 dark:bg-gray-800/70">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getOrderStatusColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Abrir detalle
        </span>

        <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <button
            className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="WhatsApp"
            data-tour="orders.whatsapp"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Duplicar"
            data-tour="orders.duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          {order.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(order, 'completed')}
              className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Completar"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          {order.status !== 'cancelled' && (
            <button
              onClick={() => onUpdateStatus(order, 'cancelled')}
              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Cancelar"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(order.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

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
    <div className="flex min-h-[65vh] flex-col gap-4 pb-24 md:pb-4">
      <div className="flex flex-col gap-3 rounded-[24px] border border-gray-200 bg-gradient-to-r from-white via-slate-50 to-white p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.28)] dark:border-gray-700 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/90 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <LayoutGrid className="h-4 w-4 text-blue-500" />
            Vista operativa por estado
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Grid sin scroll horizontal, con hasta 3 columnas por fila y columnas vacías compactadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {displayColumns.length} estado{displayColumns.length === 1 ? '' : 's'} visible{displayColumns.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setHideEmptyColumns((current) => !current)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3.5 text-sm font-medium transition-colors ${
              hideEmptyColumns
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <EyeOff className="h-4 w-4" />
            {hideEmptyColumns ? 'Mostrando solo activas' : 'Mostrar vacías'}
          </button>
        </div>
      </div>

      {displayColumns.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-300 bg-gray-50/80 p-6 text-center dark:border-gray-700 dark:bg-gray-900/60">
          <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <Circle className="h-6 w-6 text-gray-400" />
          </div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            No hay columnas con actividad para los filtros actuales
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hiddenEmptyCount > 0 ? 'Activa “Mostrar vacías” si quieres revisar todos los estados.' : 'Prueba otro rango o limpia la búsqueda.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {displayColumns.map((col) => {
            const tone = getColumnTone(col.color);
            const isEmpty = col.orders.length === 0;

            return (
              <section
                key={col.id}
                className={`flex min-w-0 flex-col rounded-[28px] border p-4 shadow-[0_22px_42px_-34px_rgba(15,23,42,0.3)] ${tone.surface} ${isEmpty ? 'pb-3' : ''}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-3">
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                        {getIcon(col.id)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                          {col.label}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isEmpty ? 'Sin pedidos activos' : `${col.orders.length} pedido${col.orders.length === 1 ? '' : 's'} en este estado`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                    {col.orders.length}
                  </span>
                </div>

                {isEmpty ? (
                  <div className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${tone.empty}`}>
                    No hay pedidos en este estado.
                  </div>
                ) : (
                  <div className="max-h-[min(58vh,720px)] min-h-0 overflow-y-auto pr-1 custom-scrollbar touch-pan-y">
                    {col.orders.map(renderCard)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {hideEmptyColumns && hiddenEmptyCount > 0 && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          {hiddenEmptyCount} columna{hiddenEmptyCount === 1 ? '' : 's'} vacía{hiddenEmptyCount === 1 ? '' : 's'} oculta{hiddenEmptyCount === 1 ? '' : 's'} para mantener el tablero compacto.
        </div>
      )}
    </div>
  );
};
