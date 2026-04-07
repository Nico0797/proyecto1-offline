import React from 'react';
import { Debt } from '../../types/debts';
import { formatCOP } from '../Expenses/helpers';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

interface UpcomingDebtsProps {
  debts: Debt[];
  loading: boolean;
}

export const UpcomingDebts: React.FC<UpcomingDebtsProps> = ({ debts, loading }) => {
  if (loading) return null;

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  // Filter debts due soon (today to next 7 days) or overdue
  const upcoming = debts
    .filter(d => {
        if (d.status === 'paid') return false;
        if (!d.due_date) return false;
        const dueDate = new Date(d.due_date);
        return dueDate <= nextWeek; // Includes overdue and next 7 days
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3); // Show max 3

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Vencimientos por atender
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {upcoming.map(debt => {
           const dueDate = new Date(debt.due_date!);
           const isOverdue = dueDate < new Date(new Date().setHours(0,0,0,0));
           const isToday = dueDate.toDateString() === new Date().toDateString();
           
           return (
            <div 
                key={debt.id}
                className={`
                    relative overflow-hidden rounded-xl border p-3 flex flex-col justify-between transition-all
                    ${isOverdue 
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' 
                        : isToday
                            ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                    }
                `}
            >
                {isOverdue && (
                    <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg bg-red-500" />
                )}
                
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                            {debt.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {debt.creditor_name}
                        </div>
                    </div>
                    <div className={`
                        p-1.5 rounded-lg 
                        ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}
                    `}>
                        {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div>
                        <div className={`text-xs font-medium mb-0.5 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {isOverdue ? 'Vencida' : isToday ? 'Vence hoy' : `Vence: ${debt.due_date}`}
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCOP(debt.balance_due)}
                        </div>
                    </div>
                </div>
            </div>
           );
        })}
      </div>
    </div>
  );
};
