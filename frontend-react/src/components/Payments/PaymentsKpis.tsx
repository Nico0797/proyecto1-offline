import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { DollarSign, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className={cn("border transition-all hover:shadow-md cursor-pointer", kpi.border)}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
              {loading ? (
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${kpi.value.toLocaleString()}
                </p>
              )}
            </div>
            <div className={cn("p-3 rounded-full", kpi.bg)}>
              <kpi.icon className={cn("w-6 h-6", kpi.color)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
