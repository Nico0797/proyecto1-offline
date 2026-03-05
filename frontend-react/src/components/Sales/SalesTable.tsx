import React from 'react';
import { Sale } from '../../types';
import { formatCOP, getStatusColor, getStatusLabel } from './helpers';
import { Eye, Trash2, DollarSign } from 'lucide-react';
import { DataTableContainer } from '../Layout/PageLayout';

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
  onDelete: (id: number) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, loading, onView, onDelete }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Cargando ventas...</div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay ventas registradas</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Crea tu primera venta para comenzar a ver datos.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3" data-tour="sales.list.mobile">
        {sales.map((sale) => (
          <div 
            key={sale.id} 
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.99] transition-transform cursor-pointer" 
            onClick={() => onView(sale)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">{formatDate(sale.sale_date)}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">{sale.customer_name || 'Cliente Casual'}</h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(sale.status || 'completed', sale.paid)}`}>
                  {getStatusLabel(sale.status || 'completed', sale.paid)}
              </span>
            </div>
            
            <div className="flex justify-between items-end border-t border-gray-50 dark:border-gray-700/50 pt-3">
                <div>
                     <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCOP(sale.total)}</p>
                </div>
                {sale.balance && sale.balance > 0 ? (
                    <div className="text-right">
                         <span className="text-xs text-gray-500 dark:text-gray-400">Saldo</span>
                         <p className="text-lg font-bold text-red-500">{formatCOP(sale.balance)}</p>
                    </div>
                ) : (
                    <div className="text-right">
                        <span className="text-xs text-green-600 font-medium">Pagado</span>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block" data-tour="sales.table.desktop">
        <DataTableContainer>
            <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Saldo</th>
                <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer" onClick={() => onView(sale)}>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatDate(sale.sale_date)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {sale.customer_name || 'Cliente Casual'}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status || 'completed', sale.paid)}`}>
                        {getStatusLabel(sale.status || 'completed', sale.paid)}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                        {formatCOP(sale.total)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                        {sale.balance && sale.balance > 0 ? (
                            <span className="text-red-500 font-medium">{formatCOP(sale.balance)}</span>
                        ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onView(sale); }}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver Detalle"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(sale.id); }}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
