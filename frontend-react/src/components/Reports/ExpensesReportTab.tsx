import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Wallet } from 'lucide-react';

interface ExpensesReportTabProps {
  data: any;
  loading: boolean;
}

export const ExpensesReportTab: React.FC<ExpensesReportTabProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const expenses = data?.expenses || [];
  const summary = data?.summary || { expenses: { total: 0 } };

  // Compute total expenses and category distribution
  const totalExpenses = summary.expenses?.total || 0;
  const categories = expenses || []; // Assuming expenses is an array of categories

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Total Gastos Operativos</h3>
              <Wallet className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totalExpenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gastos por Categoría</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3 text-right">Monto Total</th>
                <th className="px-6 py-3 text-right">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {categories.map((c: any) => (
                <tr key={c.category} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.category}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                    ${c.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {totalExpenses > 0 ? ((c.total / totalExpenses) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No hay gastos registrados en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
