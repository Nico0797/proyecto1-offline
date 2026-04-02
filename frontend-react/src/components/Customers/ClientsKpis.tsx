import React, { useState } from 'react';
import { Users, AlertCircle, DollarSign, Activity, ChevronDown } from 'lucide-react';
import { Customer } from '../../types';
import { formatCOP } from './helpers';

interface ClientsKpisProps {
  customers: Customer[];
  showReceivables?: boolean;
}

export const ClientsKpis: React.FC<ClientsKpisProps> = ({ customers, showReceivables = true }) => {
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
          className="app-surface flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="app-tone-icon-blue p-1">
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
        <div className={`grid gap-2 mb-2 md:hidden ${showReceivables ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showReceivables && (
            <>
              <div className="app-stat-card flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <div className="app-tone-icon-red p-1">
                    <AlertCircle className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Con Deuda</span>
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white">{customersWithDebt}</div>
              </div>

              <div className="app-stat-card flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <div className="app-tone-icon-amber p-1">
                    <DollarSign className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Por Cobrar</span>
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalDebt)}>{formatCOP(totalDebt)}</div>
              </div>
            </>
          )}

          <div className="app-stat-card flex items-center justify-between p-2">
             <div className="flex items-center gap-2">
              <div className="app-tone-icon-green p-1">
                <Activity className="w-3 h-3" />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Activos</span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{activeCustomers}</div>
          </div>
        </div>
      )}

      {/* Desktop View - Cards */}
      <div className={`hidden md:grid gap-3 mb-4 ${showReceivables ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
        <div className="app-stat-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="app-tone-icon-blue p-1.5">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Clientes</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {totalCustomers}
            </div>
        </div>

        {showReceivables && (
          <>
            <div className="app-stat-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="app-tone-icon-red p-1.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Con Deuda</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {customersWithDebt}
                </div>
            </div>

            <div className="app-stat-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="app-tone-icon-amber p-1.5">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Por Cobrar</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white truncate" title={formatCOP(totalDebt)}>
                    {formatCOP(totalDebt)}
                </div>
            </div>
          </>
        )}

        <div className="app-stat-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="app-tone-icon-green p-1.5">
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
