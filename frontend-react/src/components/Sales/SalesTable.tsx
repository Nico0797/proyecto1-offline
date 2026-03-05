import React from 'react';
import { Sale } from '../../types';
import { formatCOP, getStatusColor, getStatusLabel } from './helpers';
import { Eye, Trash2, DollarSign } from 'lucide-react';

// Helper for timezone-safe date formatting
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  // Append T00:00:00 to force local date interpretation if it's just YYYY-MM-DD
  // Or better, split and create date manually to avoid timezone shifts
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
            <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
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
                    onClick={() => onView(sale)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Ver Detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(sale.id)}
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
  );
};
