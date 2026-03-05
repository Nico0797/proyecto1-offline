import React from 'react';
import { TrendingDown, Calendar, RefreshCw, AlertTriangle, DollarSign } from 'lucide-react';
import { Expense } from '../../types';
import { RecurringExpense } from '../../store/recurringExpenseStore';
import { formatCOP, isDueSoon } from './helpers';

interface ExpensesKpisProps {
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
}

export const ExpensesKpis: React.FC<ExpensesKpisProps> = ({ expenses, recurringExpenses }) => {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = expenses.length;
  
  // Average daily (assuming 30 days or period duration, let's just do count for now or simple avg)
  // For simplicity, let's just show avg per expense
  const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

  const activeRecurring = recurringExpenses.filter(r => r.is_active).length;
  const upcomingRecurring = recurringExpenses.filter(r => r.is_active && isDueSoon(r.next_due_date)).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <TrendingDown className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Gastos</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalExpenses)}>{formatCOP(totalExpenses)}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Promedio</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white truncate" title={formatCOP(avgExpense)}>{formatCOP(avgExpense)}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <RefreshCw className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Recurrentes</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{activeRecurring}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Vencimientos</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{upcomingRecurring}</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Movimientos</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">{expenseCount}</div>
      </div>
    </div>
  );
};
