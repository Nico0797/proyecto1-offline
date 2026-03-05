import React, { useMemo } from 'react';
import { Card, CardContent } from '../ui/Card';
import { ShoppingCart, Users, DollarSign } from 'lucide-react';

interface SalesReportTabProps {
  data: any;
  loading: boolean;
}

export const SalesReportTab: React.FC<SalesReportTabProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const { summary, trend } = data;

  const { totalSales, salesCount, avgTicket } = useMemo(() => {
    const total = summary?.sales?.total || 0;
    const count = summary?.sales?.count || 0;
    return {
      totalSales: total,
      salesCount: count,
      avgTicket: count > 0 ? total / count : 0
    };
  }, [summary?.sales?.total, summary?.sales?.count]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Ventas Totales</h3>
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totalSales.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300"># Transacciones</h3>
              <ShoppingCart className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {salesCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Ticket Promedio</h3>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${avgTicket.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Table (Simplified) */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Historial de Ventas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3 text-right">Ventas ($)</th>
                <th className="px-6 py-3 text-right"># Transacciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {trend?.map((day: any) => (
                <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {formatDate(day.date)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                    ${(day.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {day.count || '-'}
                  </td>
                </tr>
              ))}
              {(!trend || trend.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No hay datos de ventas en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
