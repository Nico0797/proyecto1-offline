import React from 'react';
import { Users, AlertCircle, DollarSign, Activity } from 'lucide-react';
import { Customer } from '../../types';
import { formatCOP } from './helpers';

interface ClientsKpisProps {
  customers: Customer[];
}

export const ClientsKpis: React.FC<ClientsKpisProps> = ({ customers }) => {
  const totalCustomers = customers.length;
  const customersWithDebt = customers.filter(c => c.balance > 0).length;
  const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0);
  const activeCustomers = customers.length; // Placeholder

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Clientes</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">{totalCustomers}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Con Deuda</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">{customersWithDebt}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Por Cobrar</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalDebt)}>
            {formatCOP(totalDebt)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Activos</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white">{activeCustomers}</div>
      </div>
    </div>
  );
};
