import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Users, UserPlus, CreditCard } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ClientsReportTabProps {
  data: any;
  loading: boolean;
}

export const ClientsReportTab: React.FC<ClientsReportTabProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const { clients } = data;

  // Compute stats
  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter((c: any) => c.last_purchase && new Date(c.last_purchase) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0;
  const inactiveClients = totalClients - activeClients;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Clientes</h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalClients}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Clientes Activos (30d)</h3>
              <UserPlus className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeClients}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Clientes Inactivos</h3>
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{inactiveClients}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Listado de Clientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Última Compra</th>
                <th className="px-6 py-3 text-right">Deuda Total</th>
                <th className="px-6 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {clients?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {c.last_purchase ? new Date(c.last_purchase).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                    ${(c.balance || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      c.balance > 0 ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    )}>
                      {c.balance > 0 ? 'Con Deuda' : 'Al Día'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!clients || clients.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay clientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
