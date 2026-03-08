import React, { useState } from 'react';
import { Users, AlertCircle, DollarSign, Activity, ChevronDown } from 'lucide-react';
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

  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile View - Chip Button */}
      <div className="md:hidden mb-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-left shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Resumen de Clientes</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{totalCustomers}</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile: revealed KPIs */}
      {open && (
        <div className="grid grid-cols-2 gap-2 mb-2 md:hidden">
           <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Con Deuda</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{customersWithDebt}</div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <DollarSign className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Por Cobrar</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalDebt)}>{formatCOP(totalDebt)}</div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
             <div className="flex items-center gap-2">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Activity className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Activos</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{activeCustomers}</div>
          </div>
        </div>
      )}

      {/* Desktop View - Cards */}
      <div className="hidden md:grid md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Clientes</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {totalCustomers}
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Con Deuda</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {customersWithDebt}
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Por Cobrar</span>
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
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Activos</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {activeCustomers}
            </div>
        </div>
      </div>
    </>
  );
};
