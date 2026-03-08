import React from 'react';
import { TrendingDown, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { DebtsSummary } from '../../types/debts';
import { formatCOP } from '../Expenses/helpers';

interface DebtSummaryProps {
  summary: DebtsSummary | null;
}

export const DebtSummary: React.FC<DebtSummaryProps> = ({ summary }) => {
  if (!summary) return null;

  const items = [
    {
      label: 'Total Adeudado',
      value: formatCOP(summary.total_debt),
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800/30'
    },
    {
      label: 'Vencido',
      value: formatCOP(summary.overdue_total),
      sub: summary.overdue_count > 0 ? `(${summary.overdue_count} deudas)` : null,
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800/30'
    },
    {
      label: 'Pagado Mes',
      value: formatCOP(summary.paid_this_month),
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800/30'
    },
    {
      label: 'Próximo Venc.',
      value: summary.next_due ? summary.next_due.name : 'No hay',
      sub: summary.next_due ? summary.next_due.due_date : null,
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800/30'
    }
  ];

  return (
    <>
      {/* Mobile View: Grid Chips */}
      <div className="md:hidden grid grid-cols-2 gap-3 mb-4">
        {items.map((item, idx) => (
          <button 
            key={idx}
            className={`
              flex items-center gap-2 pl-2 pr-3 py-2 rounded-full w-full text-left
              bg-white dark:bg-gray-800 border ${item.border || 'border-gray-200 dark:border-gray-700'} shadow-sm
              transition-all hover:shadow-md active:scale-95 cursor-pointer overflow-hidden
            `}
          >
            <div className={`p-1.5 shrink-0 rounded-full ${item.bg} ${item.color}`}>
              <item.icon className="w-3.5 h-3.5" />
            </div>
            
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1 truncate">
                {item.label}
              </span>
              <div className="flex items-baseline gap-1 min-w-0">
                  <span className={`text-xs font-bold text-gray-900 dark:text-white leading-none truncate`}>
                  {item.value}
                  </span>
                  {item.sub && (
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium leading-none truncate shrink-0">
                      {item.sub}
                  </span>
                  )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop View: Grid Cards */}
      <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
        {items.map((item, idx) => (
          <div 
            key={idx}
            className={`
              relative overflow-hidden rounded-xl p-4 flex flex-col justify-between 
              bg-white dark:bg-gray-800 border ${item.border || 'border-gray-200 dark:border-gray-700'} shadow-sm
              transition-all hover:shadow-md h-full
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {item.label}
              </span>
              <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
            </div>
            
            <div>
              <div className={`text-2xl font-bold text-gray-900 dark:text-white truncate ${item.value.length > 15 ? 'text-xl' : ''}`}>
                {item.value}
              </div>
              {item.sub && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {item.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
