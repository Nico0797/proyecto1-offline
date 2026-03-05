import React from 'react';
import { ClientReceivable } from '../../utils/receivables.compute';
import { Button } from '../ui/Button';
import { ArrowRight, User, AlertTriangle, MessageSquare, Wallet } from 'lucide-react';

interface ByClientTabProps {
  data: ClientReceivable[];
  loading: boolean;
  onSelectClient: (client: ClientReceivable) => void;
  onQuickPay: (client: ClientReceivable) => void;
  onWhatsApp: (client: ClientReceivable) => void;
}

export const ByClientTab: React.FC<ByClientTabProps> = ({
  data,
  loading,
  onSelectClient,
  onQuickPay,
  onWhatsApp
}) => {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando clientes...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <User className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sin deudas pendientes</h3>
        <p className="text-gray-500 text-center max-w-sm mt-2">
          ¡Excelente! No hay clientes con saldo pendiente en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-medium tracking-wider">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4 text-right">Saldo Total</th>
              <th className="px-6 py-4 text-center">Facturas</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((client) => (
              <tr 
                key={client.customerId} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                onClick={() => onSelectClient(client)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {client.customerName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {client.customerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Último pago: {client.lastPaymentDate ? new Date(client.lastPaymentDate).toLocaleDateString() : 'Nunca'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    ${client.totalDebt.toLocaleString()}
                  </p>
                  {client.overdueDebt > 0 && (
                    <p className="text-xs text-red-500 font-medium mt-1">
                      ${client.overdueDebt.toLocaleString()} vencido
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    {client.invoiceCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {client.isOverdue || client.maxDaysOverdue > 30 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      Vencido ({client.maxDaysOverdue}d)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      Al día
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={(e) => { e.stopPropagation(); onWhatsApp(client); }}
                      title="Enviar recordatorio"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white border-none"
                      onClick={(e) => { e.stopPropagation(); onQuickPay(client); }}
                    >
                      <Wallet className="w-3 h-3 mr-1.5" />
                      Abonar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); onSelectClient(client); }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
