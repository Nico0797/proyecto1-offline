import React from 'react';
import { Expense } from '../../types';
import { formatCOP } from './helpers';
import { PieChart, TrendingUp } from 'lucide-react';

interface ExpensesAnalyticsTabProps {
  expenses: Expense[];
}

export const ExpensesAnalyticsTab: React.FC<ExpensesAnalyticsTabProps> = ({ expenses }) => {
  // 1. Category Breakdown
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([name, total]) => ({ name, total }));

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Trend (Last 7 days vs Previous 7 days) - Simplified
  // Just showing daily totals for now
  /*
  const dailyTotals = expenses.reduce((acc, expense) => {
    const date = new Date(expense.expense_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  */
  
  // Insights
  const maxCategory = sortedCategories[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 <PieChart className="w-5 h-5 text-blue-500" /> Distribución por Categoría
             </h3>
             <span className="text-sm text-gray-500 dark:text-gray-400">Total: {formatCOP(totalExpenses)}</span>
          </div>
          
          <div className="space-y-4">
             {sortedCategories.map((cat, index) => {
                 const percentage = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
                 return (
                     <div key={cat.name} className="relative">
                         <div className="flex justify-between text-sm mb-1">
                             <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                             <span className="font-bold text-gray-900 dark:text-white">{formatCOP(cat.total)} ({percentage.toFixed(1)}%)</span>
                         </div>
                         <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                             <div 
                                className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : index === 1 ? 'bg-purple-600' : index === 2 ? 'bg-green-600' : 'bg-gray-400'}`} 
                                style={{ width: `${percentage}%` }}
                             ></div>
                         </div>
                     </div>
                 );
             })}
             {sortedCategories.length === 0 && (
                 <div className="text-center text-gray-500 py-8">No hay datos para mostrar</div>
             )}
          </div>
        </div>

        {/* Insights & Summary */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
               <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                   <TrendingUp className="w-5 h-5 text-green-500" /> Insights
               </h3>
               {maxCategory ? (
                   <div className="space-y-4">
                       <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                           <p className="text-sm text-blue-800 dark:text-blue-300 mb-1 font-medium">Categoría Principal</p>
                           <p className="text-xs text-blue-600 dark:text-blue-400">
                               Tu mayor gasto es en <span className="font-bold">{maxCategory.name}</span>, representando el {((maxCategory.total / totalExpenses) * 100).toFixed(0)}% del total.
                           </p>
                       </div>
                       <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                           <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-1 font-medium">Frecuencia</p>
                           <p className="text-xs text-yellow-600 dark:text-yellow-400">
                               Has registrado {expenses.length} movimientos en este periodo.
                           </p>
                       </div>
                   </div>
               ) : (
                   <p className="text-gray-500 text-sm">Registra gastos para ver insights.</p>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};
