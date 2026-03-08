import React, { useState } from 'react';
import { TrendingDown, Calendar, RefreshCw, AlertTriangle, DollarSign, ChevronDown } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  
  // Average daily (assuming 30 days or period duration, let's just do count for now or simple avg)
  // For simplicity, let's just show avg per expense
  const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

  const activeRecurring = recurringExpenses.filter(r => r.is_active).length;
  const upcomingRecurring = recurringExpenses.filter(r => r.is_active && isDueSoon(r.next_due_date)).length;

  return (
    <>
    {/* Mobile: single professional button that reveals KPIs */}
    <div className="md:hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-left shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Resumen de Gastos</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCOP(totalExpenses)}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>

    {/* Mobile: revealed KPIs */}
    {open && (
      <div className="grid grid-cols-3 gap-2 mb-2 md:hidden">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-1.5 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <TrendingDown className="w-3 h-3" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Total</span>
          </div>
          <div className="text-[11px] font-bold text-gray-900 dark:text-white">{formatCOP(totalExpenses)}</div>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-1.5 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <DollarSign className="w-3 h-3" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Promedio</span>
          </div>
          <div className="text-[11px] font-bold text-gray-900 dark:text-white">{formatCOP(avgExpense)}</div>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-1.5 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Movims.</span>
          </div>
          <div className="text-[11px] font-bold text-gray-900 dark:text-white">{expenseCount}</div>
        </div>
      </div>
    )}

    {/* Desktop: compact cards */}
    <div className="hidden md:grid grid-cols-5 gap-3 mb-6">
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur md:backdrop-blur-0 p-1.5 md:p-3 rounded-full md:rounded-xl shadow-none md:shadow-sm border border-gray-200 dark:border-gray-700 flex items-center md:flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />
          </div>
          <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">Total Gastos</span>
        </div>
        <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-white truncate md:mt-1" title={formatCOP(totalExpenses)}>{formatCOP(totalExpenses)}</div>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur md:backdrop-blur-0 p-1.5 md:p-3 rounded-full md:rounded-xl shadow-none md:shadow-sm border border-gray-200 dark:border-gray-700 flex items-center md:flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
          </div>
          <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">Promedio</span>
        </div>
        <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-white truncate md:mt-1" title={formatCOP(avgExpense)}>{formatCOP(avgExpense)}</div>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur md:backdrop-blur-0 p-1.5 md:p-3 rounded-full md:rounded-xl shadow-none md:shadow-sm border border-gray-200 dark:border-gray-700 flex items-center md:flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
          </div>
          <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">Recurrentes</span>
        </div>
        <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-white md:mt-1">{activeRecurring}</div>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur md:backdrop-blur-0 p-1.5 md:p-3 rounded-full md:rounded-xl shadow-none md:shadow-sm border border-gray-200 dark:border-gray-700 flex items-center md:flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
          </div>
          <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">Vencimientos</span>
        </div>
        <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-white md:mt-1">{upcomingRecurring}</div>
      </div>
      
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur md:backdrop-blur-0 p-1.5 md:p-3 rounded-full md:rounded-xl shadow-none md:shadow-sm border border-gray-200 dark:border-gray-700 flex items-center md:flex-col justify-between">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
          </div>
          <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">Movimientos</span>
        </div>
        <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-white md:mt-1">{expenseCount}</div>
      </div>
    </div>
    </>
  );
};
