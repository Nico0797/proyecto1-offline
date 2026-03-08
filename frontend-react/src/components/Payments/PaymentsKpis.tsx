import React, { useState } from 'react';
import { DollarSign, CreditCard, AlertTriangle, TrendingUp, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KpiProps {
  totalReceivable: number;
  paymentsThisPeriod: number;
  overdueDebt: number;
  averagePayment: number;
  loading?: boolean;
}

export const PaymentsKpis: React.FC<KpiProps> = ({
  totalReceivable,
  paymentsThisPeriod,
  overdueDebt,
  averagePayment,
  loading
}) => {
  const [open, setOpen] = useState(false);

  const kpis = [
    {
      label: 'Por Cobrar Total',
      value: totalReceivable,
      icon: DollarSign,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      label: 'Abonos (Mes)',
      value: paymentsThisPeriod,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    },
    {
      label: 'Deuda Vencida',
      value: overdueDebt,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    {
      label: 'Promedio Abono',
      value: averagePayment,
      icon: CreditCard,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    }
  ];

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
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Cartera y Pagos</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">${totalReceivable.toLocaleString()}</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Mobile: revealed KPIs */}
      {open && (
        <div className="grid grid-cols-2 gap-2 mb-2 md:hidden">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("w-3 h-3", kpi.color)} />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{kpi.label}</span>
              </div>
              <div className="text-xs font-bold text-gray-900 dark:text-white truncate" title={kpi.value.toLocaleString()}>
                ${kpi.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop View - Cards */}
      <div className="hidden md:grid md:grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi, index) => (
          <div key={index} className={cn("bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border transition-all hover:shadow-md cursor-pointer", kpi.border)}>
             <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                {loading ? (
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    ${kpi.value.toLocaleString()}
                  </p>
                )}
              </div>
              <div className={cn("p-1.5 rounded-lg", kpi.bg)}>
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
