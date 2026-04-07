import React from 'react';
import { Expense } from '../../types';
import { formatCOP } from './helpers';
import { Edit2, Trash2, Calendar, Tag } from 'lucide-react';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';
import { DataTableContainer } from '../ui/DataTableContainer';

interface ExpensesTableProps {
  expenses: Expense[];
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
  onCreate?: () => void;
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, loading, canEdit, canDelete, onEdit, onDelete, onCreate }) => {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando gastos...</div>;
  }

  if (expenses.length === 0) {
    return (
      <TeachingEmptyState
        icon={Calendar}
        title="No hay gastos registrados en este corte"
        description="Cuando registres una salida real de dinero, aparecerá aquí con su categoría y origen."
        nextStep="Empieza con el gasto que ya ocurrió hoy."
        primaryActionLabel={onCreate ? 'Registrar gasto' : undefined}
        onPrimaryAction={onCreate}
      />
    );
  }

  const formatDateTime = (value: string) => {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsedDate = new Date(isDateOnly ? `${value}T00:00:00` : value);
    if (Number.isNaN(parsedDate.getTime())) return value;
    const dateLabel = parsedDate.toLocaleDateString('es-CO');
    if (isDateOnly) return dateLabel;
    return `${dateLabel} ${parsedDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getSourceLabel = (expense: Expense) => {
    if (expense.source_type === 'debt_payment') {
      return expense.debt_scope === 'financial' ? 'Pago de deuda financiera' : 'Pago de obligación operativa';
    }
    if (expense.source_type === 'supplier_payment') return 'Pago a proveedor';
    if (expense.source_type === 'purchase_payment') return 'Compra pagada';
    if (expense.source_type === 'recurring') return 'Recurrente ejecutado';
    return 'Gasto directo';
  };

  const getSourceTone = (expense: Expense) => {
    if (expense.source_type === 'debt_payment') {
      return expense.debt_scope === 'financial'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (expense.source_type === 'supplier_payment') return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
    if (expense.source_type === 'purchase_payment') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    if (expense.source_type === 'recurring') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  const isOriginManaged = (expense: Expense) => ['debt_payment', 'supplier_payment', 'purchase_payment'].includes(expense.source_type || '');

  return (
    <>
      <div className="md:hidden space-y-2">
        {expenses.map((expense) => {
          const CardTag = canEdit && !isOriginManaged(expense) ? 'button' : 'div';

          return (
            <CardTag
              key={expense.id}
              onClick={canEdit && !isOriginManaged(expense) ? () => onEdit(expense) : undefined}
              className="w-full text-left bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm active:scale-[0.99] transition-transform"
              aria-label="Ver detalle de gasto"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{expense.description}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      <Tag className="w-3 h-3 mr-1" />
                      {expense.category}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceTone(expense)}`}>
                      {getSourceLabel(expense)}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatDateTime(expense.expense_date)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCOP(expense.amount)}</div>
                  {((canEdit && !isOriginManaged(expense)) || (canDelete && !isOriginManaged(expense))) ? (
                    <div className="flex gap-1">
                      {canEdit && !isOriginManaged(expense) ? (
                        <span
                          onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                          className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </span>
                      ) : null}
                      {canDelete && !isOriginManaged(expense) ? (
                        <span
                          onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
                          className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {isOriginManaged(expense) ? 'Origen automático' : 'Solo lectura'}
                    </span>
                  )}
                </div>
              </div>
            </CardTag>
          );
        })}
      </div>

      <div className="hidden md:block">
        <DataTableContainer>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-center">Autor</th>
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
                    <div className="flex flex-col gap-1">
                      <span>{expense.description}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getSourceTone(expense)}`}>
                          {getSourceLabel(expense)}
                        </span>
                        {expense.payment_method ? (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {expense.payment_method}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {expense.created_by_name ? (
                      <div className="flex flex-col items-center">
                        <span className="text-gray-900 dark:text-white font-medium text-sm">{expense.created_by_name}</span>
                        {expense.created_by_role ? (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{expense.created_by_role}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600 italic text-xs">Histórico</span>
                    )}
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
                    {((canEdit && !isOriginManaged(expense)) || (canDelete && !isOriginManaged(expense))) ? (
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && !isOriginManaged(expense) ? (
                          <button
                            onClick={() => onEdit(expense)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : null}
                        {canDelete && !isOriginManaged(expense) ? (
                          <button
                            onClick={() => onDelete(expense.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {isOriginManaged(expense) ? 'Origen automático' : 'Solo lectura'}
                      </span>
                    )}
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
