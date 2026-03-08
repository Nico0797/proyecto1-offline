import React from 'react';
import { Expense } from '../../types';
import { formatCOP } from './helpers';
import { Edit2, Trash2, Calendar, Tag } from 'lucide-react';

interface ExpensesTableProps {
  expenses: Expense[];
  loading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, loading, onEdit, onDelete }) => {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando gastos...</div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay gastos registrados</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Registra tus gastos para llevar el control.</p>
      </div>
    );
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

  return (
    <>
      {/* Mobile: compact cards */}
      <div className="md:hidden space-y-2">
        {expenses.map((expense) => (
          <button
            key={expense.id}
            onClick={() => onEdit(expense)}
            className="w-full text-left bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm active:scale-[0.99] transition-transform"
            aria-label="Ver detalle de gasto"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{expense.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <Tag className="w-3 h-3 mr-1" />
                    {expense.category}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {formatDateTime(expense.expense_date)}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCOP(expense.amount)}</div>
                <div className="flex gap-1">
                  <span
                    onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                    className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table view */}
      <table className="hidden md:table w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-6 py-4">Fecha</th>
            <th className="px-6 py-4">Descripción</th>
            <th className="px-6 py-4">Categoría</th>
            <th className="px-6 py-4 text-right">Monto</th>
            <th className="px-6 py-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                {formatDateTime(expense.expense_date)}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {expense.description}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Tag className="w-3 h-3 mr-1" />
                  {expense.category}
                </span>
              </td>
              <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                {formatCOP(expense.amount)}
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(expense)}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(expense.id)}
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
    </>
  );
};
