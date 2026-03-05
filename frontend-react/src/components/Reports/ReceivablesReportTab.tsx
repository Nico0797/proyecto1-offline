import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ReceivablesReportTabProps {
  data: any;
  loading: boolean;
}

export const ReceivablesReportTab: React.FC<ReceivablesReportTabProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const clients = data?.clients || [];

  // Compute receivables
  const totalReceivable = clients.reduce((acc: number, c: any) => acc + (c.balance > 0 ? c.balance : 0), 0);
  const overdueReceivable = clients.reduce((acc: number, c: any) => acc + (c.is_overdue ? c.balance : 0), 0); // Assuming is_overdue exists or needs computation
  
  // Filter clients with debt
  const debtors = clients.filter((c: any) => c.balance > 0).sort((a: any, b: any) => b.balance - a.balance);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total por Cobrar</h3>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totalReceivable.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Cartera Vencida</h3>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${overdueReceivable.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalle de Cartera</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3 text-right">Saldo Pendiente</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {debtors.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                    ${c.balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      c.is_overdue 
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                    )}>
                      {c.is_overdue ? 'Vencido' : 'Por Vencer'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {debtors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                      <p>¡Excelente! No hay clientes con deuda pendiente.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
