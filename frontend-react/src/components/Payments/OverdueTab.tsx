import React from 'react';
import { ClientReceivable } from '../../utils/receivables.compute';
import { Button } from '../ui/Button';
import { AlertCircle, Clock, MessageCircle, DollarSign } from 'lucide-react';

interface OverdueTabProps {
  data: ClientReceivable[];
  loading: boolean;
  onSendReminder: (client: ClientReceivable) => void;
}

export const OverdueTab: React.FC<OverdueTabProps> = ({
  data,
  loading,
  onSendReminder
}) => {
  const overdueClients = data.filter(c => c.overdueDebt > 0 || c.isOverdue || c.maxDaysOverdue > 30);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando vencimientos...</div>;
  }

  if (overdueClients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-green-300 dark:border-green-700">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-green-600 dark:text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">¡Todo al día!</h3>
        <p className="text-gray-500 text-center max-w-sm mt-2">
          No hay deudas vencidas en este momento. ¡Excelente gestión de cobranza!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {overdueClients.map((client) => (
        <div 
          key={client.customerId} 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 relative overflow-hidden group hover:shadow-md transition-shadow"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="w-24 h-24 text-red-500 transform rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {client.customerName}
                </h3>
                <div className="flex items-center text-red-500 text-sm font-medium">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {client.maxDaysOverdue} días de atraso
                </div>
              </div>
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-1 rounded uppercase">
                Vencido
              </span>
            </div>

            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deuda Vencida</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${client.overdueDebt.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Total Deuda</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  ${client.totalDebt.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => onSendReminder(client)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none shadow-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Recordar Pago
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
