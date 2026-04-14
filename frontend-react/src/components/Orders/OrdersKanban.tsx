import React from 'react';
import { Order } from '../../types';
import { formatCOP, getOrderStatusColor, getOrderStatusLabel } from './helpers';
import { Clock, CheckCircle, XCircle, Trash2, Loader2, Circle, EyeOff, LayoutGrid, MoreHorizontal, Eye } from 'lucide-react';
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
  const [expandedMenuId, setExpandedMenuId] = React.useState<number | null>(null);

  const getIcon = (id: string) => {
    switch (id) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500 dark:text-amber-300" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const col = columns.find((column) => column.id === status);
    return col ? col.label : getOrderStatusLabel(status);
  };

  const getColumnTone = (color?: string) => {
    switch (color) {
      case 'yellow':
        return {
          surface: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/95',
          icon: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200',
          badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
          empty: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
        };
      case 'blue':
        return {
          surface: 'border-blue-200 bg-white dark:border-blue-500/25 dark:bg-slate-900/95',
          icon: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-200',
          badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200',
          empty: 'border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/8 dark:text-blue-200',
        };
      case 'green':
        return {
          surface: 'border-emerald-200 bg-white dark:border-emerald-500/25 dark:bg-slate-900/95',
          icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200',
          badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
          empty: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:text-emerald-200',
        };
      case 'red':
        return {
          surface: 'border-rose-200 bg-white dark:border-rose-500/25 dark:bg-slate-900/95',
          icon: 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200',
          badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
          empty: 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/8 dark:text-rose-200',
        };
      default:
        return {
          surface: 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900/95',
          icon: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
          badge: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
          empty: 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
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
  const kanbanColumns = displayColumns.filter((col) => ['pending', 'completed', 'cancelled'].includes(col.id));
  const boardColumns = kanbanColumns.length > 0 ? kanbanColumns : displayColumns;

  const renderCard = (order: Order) => {
    const isMenuOpen = expandedMenuId === order.id;
    const total = order.total && order.total > 0
      ? order.total
      : (order.items || []).reduce((sum, item) => sum + (item.total || (item.quantity * item.unit_price)), 0);

    return (
      <article
        key={order.id}
        className="rounded-[20px] border border-gray-200 bg-white p-3.5 shadow-sm transition-colors hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900"
        onClick={() => onView(order)}
        data-tour="orders.card"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-slate-500">
              Cliente
            </div>
            <div className="mt-1 min-w-0 text-sm font-semibold leading-5 text-gray-900 dark:text-white">
              <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={order.customer_name || 'Cliente casual'}>
                {order.customer_name || 'Cliente casual'}
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            #{order.id}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-slate-500">Fecha</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-slate-200">
              {new Date(order.order_date + 'T00:00:00').toLocaleDateString()}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-slate-500">Total</div>
            <div className="mt-1 text-lg font-bold tracking-tight text-blue-600 dark:text-blue-300">
              {formatCOP(total)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          <span className={`inline-flex min-w-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getOrderStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-slate-800 dark:text-slate-300">
            {(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-slate-800" onClick={(event) => event.stopPropagation()}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onView(order)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Eye className="h-4 w-4" />
              Ver
            </button>
            {order.status === 'pending' ? (
              <button
                type="button"
                onClick={() => onUpdateStatus(order, 'completed')}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200"
              >
                <CheckCircle className="h-4 w-4" />
                Completar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setExpandedMenuId((current) => (current === order.id ? null : order.id))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <MoreHorizontal className="h-4 w-4" />
              Más
            </button>
          </div>

          {isMenuOpen ? (
            <div className="mt-2 flex min-w-0 flex-wrap gap-2">
              {order.status !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order, 'cancelled')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onDelete(order.id)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-red-500/20 dark:hover:bg-red-500/10 dark:hover:text-red-200"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  if (singleColumn) {
    return (
      <div className="flex h-full flex-col gap-3 pb-24">
        {orders.map(renderCard)}
        {orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center text-sm italic text-gray-400">
            <div className="mb-3 rounded-full bg-gray-50 p-4 dark:bg-gray-800">
              <Circle className="h-8 w-8 text-gray-300" />
            </div>
            No hay pedidos en esta categoría
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[65vh] flex-col gap-3 pb-20 md:pb-4">
      <div className="flex flex-col gap-3 rounded-[22px] border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <LayoutGrid className="h-4 w-4 text-blue-500" />
            Tablero por estado
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Columnas reales con scroll horizontal en móvil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {boardColumns.length} columna{boardColumns.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setHideEmptyColumns((current) => !current)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
              hideEmptyColumns
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <EyeOff className="h-4 w-4" />
            {hideEmptyColumns ? 'Solo activas' : 'Mostrar vacías'}
          </button>
        </div>
      </div>

      {boardColumns.length === 0 ? (
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
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3 px-1">
            {boardColumns.map((col) => {
              const tone = getColumnTone(col.color);
              const isEmpty = col.orders.length === 0;

              return (
                <section
                  key={col.id}
                  className={`flex min-h-[420px] w-[min(82vw,320px)] shrink-0 flex-col rounded-[22px] border p-3.5 shadow-sm ${tone.surface}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2.5">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                          {getIcon(col.id)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{col.label}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isEmpty ? 'Sin pedidos activos' : `${col.orders.length} pedido${col.orders.length === 1 ? '' : 's'}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex min-w-8 shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                      {col.orders.length}
                    </span>
                  </div>

                  {isEmpty ? (
                    <div className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${tone.empty}`}>
                      No hay pedidos en este estado.
                    </div>
                  ) : (
                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1 touch-pan-y">
                      <div className="space-y-3">
                        {col.orders.map(renderCard)}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {hideEmptyColumns && hiddenEmptyCount > 0 ? (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          {hiddenEmptyCount} columna{hiddenEmptyCount === 1 ? '' : 's'} vacía{hiddenEmptyCount === 1 ? '' : 's'} oculta{hiddenEmptyCount === 1 ? '' : 's'} para mantener el tablero compacto.
        </div>
      ) : null}
    </div>
  );
};
