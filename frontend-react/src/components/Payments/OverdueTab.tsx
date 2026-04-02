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
  const reminderClients = data.filter((client) =>
    ['overdue', 'due_today', 'due_soon'].includes(client.status)
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando vencimientos...</div>;
  }

  if (reminderClients.length === 0) {
    return (
      <div className="app-empty-state flex flex-col items-center justify-center p-12">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-green-600 dark:text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sin recordatorios pendientes</h3>
        <p className="text-gray-500 text-center max-w-sm mt-2">
          No hay cuentas por recordar en este momento. ¡Excelente gestión de cobranza!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {reminderClients.map((client) => (
        <div 
          key={client.customerId} 
          className={`app-surface group relative overflow-hidden p-5 transition-shadow hover:shadow-md ${
            client.status === 'overdue'
              ? 'border-red-200 dark:border-red-900/50'
              : client.status === 'due_today'
                ? 'border-orange-200 dark:border-orange-900/50'
                : 'border-yellow-200 dark:border-yellow-900/50'
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="w-24 h-24 text-red-500 transform rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {client.customerName}
                </h3>
                <div className={`mt-1 flex items-center text-sm font-medium ${
                  client.status === 'overdue'
                    ? 'text-red-500'
                    : client.status === 'due_today'
                      ? 'text-orange-500'
                      : 'text-yellow-600'
                }`}>
                  <Clock className="w-4 h-4 mr-1.5" />
                  {client.status === 'overdue'
                    ? `${client.maxDaysOverdue} días de atraso`
                    : client.status === 'due_today'
                      ? 'Vence hoy'
                      : `Vence ${client.nearestDueDate ? new Date(client.nearestDueDate).toLocaleDateString() : 'pronto'}`}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                client.status === 'overdue'
                  ? 'app-status-chip-danger'
                  : client.status === 'due_today'
                    ? 'app-status-chip-warning'
                    : 'app-status-chip-warning'
              }`}>
                {client.statusLabel}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {client.status === 'overdue' ? 'Deuda Vencida' : 'Saldo Pendiente'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${client.status === 'overdue' ? client.overdueDebt.toLocaleString() : client.totalDebt.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Próximo venc.</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {client.nearestDueDate ? new Date(client.nearestDueDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button 
                onClick={() => onSendReminder(client)}
                className="w-full border-none bg-green-600 text-white shadow-sm hover:bg-green-700 sm:w-auto"
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
