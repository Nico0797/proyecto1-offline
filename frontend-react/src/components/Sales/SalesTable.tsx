import React from 'react';
import { Sale } from '../../types';
import { formatCOP, getStatusColor, getStatusLabel } from './helpers';
import { Eye, Trash2, DollarSign, Pencil, CalendarDays } from 'lucide-react';
import { DataTableContainer } from '../Layout/PageLayout';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';

// Helper for timezone-safe date formatting
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
};

interface SalesTableProps {
  sales: Sale[];
  loading: boolean;
  onView: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  onDelete: (id: number) => void;
  onCreate?: () => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, loading, onView, onEdit, onDelete, onCreate }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando ventas...</div>
    );
  }

  if (sales.length === 0) {
    return (
      <TeachingEmptyState
        icon={DollarSign}
        title="No hay ventas registradas"
        description="Cuando empieces a vender, aquí verás tus operaciones y saldos pendientes."
        nextStep="Registra tu primera venta."
        primaryActionLabel={onCreate ? 'Crear primera venta' : undefined}
        onPrimaryAction={onCreate}
      />
    );
  }

  return (
    <>
      {/* Mobile Card List */}
      <div className="space-y-3 lg:hidden" data-tour="sales.list.mobile">
        {sales.map((sale) => (
          <div 
            key={sale.id} 
            className="app-surface cursor-pointer p-4 active:scale-[0.99] transition-transform" 
            onClick={() => onView(sale)}
          >
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">{formatDate(sale.sale_date)}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">{sale.customer_name || 'Cliente Casual'}</h3>
                {sale.sale_origin === 'appointment' && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <CalendarDays className="h-3 w-3" /> Cita
                  </span>
                )}
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(sale.status || 'completed', sale.paid)}`}>
                  {getStatusLabel(sale.status || 'completed', sale.paid)}
              </span>
            </div>
            
            <div className="app-divider flex justify-between items-end border-t pt-2.5">
                <div>
                     <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                     <p className="text-base font-bold text-gray-900 dark:text-white">{formatCOP(sale.total)}</p>
                </div>
                {sale.balance && sale.balance > 0 ? (
                    <div className="text-right">
                         <span className="text-xs text-gray-500 dark:text-gray-400">Saldo</span>
                         <p className="text-base font-bold text-red-500">{formatCOP(sale.balance)}</p>
                    </div>
                ) : (
                    <div className="text-right">
                        <span className="text-xs text-green-600 font-medium">Pagado</span>
                    </div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(sale); }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(sale.id); }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block" data-tour="sales.table.desktop">
        <DataTableContainer>
            <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="app-table-head sticky top-0 z-10 shadow-sm font-medium">
                <tr>
                <th className="px-6 py-3.5">Venta</th>
                <th className="px-6 py-3.5 text-center">Estado</th>
                <th className="px-6 py-3.5 text-right">Total</th>
                <th className="px-6 py-3.5 text-right">Saldo</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
                </tr>
            </thead>
            <tbody className="app-table-body divide-y divide-gray-100 dark:divide-gray-700">
                {sales.map((sale) => (
                    <tr key={sale.id} className="app-table-row group cursor-pointer" onClick={() => onView(sale)}>
                    <td className="px-6 py-3.5">
                        <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {sale.customer_name || 'Cliente Casual'}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatDate(sale.sale_date)}</span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span>Venta #{sale.id}</span>
                              {sale.sale_origin === 'appointment' && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                    <CalendarDays className="h-3 w-3" /> Desde cita
                                  </span>
                                </>
                              )}
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span>
                                {sale.created_by_name
                                  ? `${sale.created_by_name}${sale.created_by_role ? ` · ${sale.created_by_role}` : ''}`
                                  : 'Histórico'}
                              </span>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status || 'completed', sale.paid)}`}>
                        {getStatusLabel(sale.status || 'completed', sale.paid)}
                        </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                        <div className="font-bold text-gray-900 dark:text-white">{formatCOP(sale.total)}</div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Total vendido</div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                        {sale.balance && sale.balance > 0 ? (
                            <div>
                              <div className="font-bold text-red-600 dark:text-red-400">{formatCOP(sale.balance)}</div>
                              <div className="mt-0.5 text-xs text-red-500/80 dark:text-red-400/80">Pendiente por cobrar</div>
                            </div>
                        ) : (
                            <div>
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400">Pagado</div>
                              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Sin saldo pendiente</div>
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onView(sale); }}
                            className="app-inline-action inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                            title="Ver detalle"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(sale); }}
                            className="app-inline-action inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                            title="Editar"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(sale.id); }}
                            className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:ring-offset-gray-800"
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
        </DataTableContainer>
      </div>
    </>
  );
};
