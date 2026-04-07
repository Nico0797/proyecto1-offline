import React from 'react';
import { ClientReceivable } from '../../utils/receivables.compute';
import { Button } from '../ui/Button';
import { ArrowRight, User, AlertTriangle, MessageSquare, Wallet } from 'lucide-react';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';

interface ByClientTabProps {
  data: ClientReceivable[];
  loading: boolean;
  onSelectClient: (client: ClientReceivable) => void;
  onQuickPay: (client: ClientReceivable) => void;
  onWhatsApp: (client: ClientReceivable) => void;
  canQuickPay: boolean;
  canSendReminder: boolean;
}

export const ByClientTab: React.FC<ByClientTabProps> = ({
  data,
  loading,
  onSelectClient,
  onQuickPay,
  onWhatsApp,
  canQuickPay,
  canSendReminder
}) => {
  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando clientes...</div>;
  }

  if (data.length === 0) {
    return (
      <TeachingEmptyState
        icon={User}
        title="No hay clientes con saldo pendiente"
        description="Cuando vendas con saldo pendiente o recibas abonos parciales, aquí podrás cobrar más rápido."
        nextStep="Si hoy alguien te debe, registra la venta con cliente y deja el saldo pendiente."
      />
    );
  }

  return (
    <>
      {/* Mobile Card List */}
      <div className="space-y-3 lg:hidden">
        {data.map((client) => (
            <div
              key={client.customerId}
              className="app-surface p-4 active:scale-[0.99] transition-transform"
              onClick={() => onSelectClient(client)}
            >
               <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">
                            {client.customerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{client.customerName}</h3>
                            <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                {client.nearestDueDate
                                  ? `Vence ${new Date(client.nearestDueDate).toLocaleDateString()}`
                                  : 'Sin vencimiento'}
                            </p>
                        </div>
                   </div>
                   {client.status === 'overdue' ? (
                        <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">Vencido</span>
                   ) : client.status === 'due_today' ? (
                        <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">Vence hoy</span>
                   ) : client.status === 'due_soon' ? (
                        <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">Por vencer</span>
                   ) : (
                        <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px] font-bold px-2 py-1 rounded-full shrink-0">Al día</span>
                   )}
               </div>

               <div className="app-divider flex justify-between items-end border-t pt-2.5">
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Deuda Total</span>
                        <p className="text-base font-bold text-gray-900 dark:text-white">${client.totalDebt.toLocaleString()}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {client.status === 'overdue'
                            ? `${client.maxDaysOverdue} días de mora`
                            : `${client.invoiceCount} cuentas abiertas`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canSendReminder && (
                          <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onWhatsApp(client); }}>
                              <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                        {canQuickPay && (
                          <Button size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); onQuickPay(client); }}>
                              Cobrar
                          </Button>
                        )}
                    </div>
               </div>
            </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="app-surface hidden overflow-hidden lg:block">
        <div className="custom-scrollbar overflow-x-auto overscroll-x-contain">
          <table className="min-w-[860px] w-full border-collapse text-left">
            <thead>
              <tr className="app-table-head text-xs uppercase font-medium tracking-wider">
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Seguimiento</th>
                <th className="px-6 py-3.5 text-right">Saldo</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="app-table-body divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((client) => (
                <tr 
                  key={client.customerId} 
                  className="app-table-row group cursor-pointer"
                  onClick={() => onSelectClient(client)}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                        {client.customerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {client.customerName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {client.invoiceCount} cuenta{client.invoiceCount === 1 ? '' : 's'} abierta{client.invoiceCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      {client.status === 'overdue' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        Vencido ({client.maxDaysOverdue}d)
                      </span>
                    ) : client.status === 'due_today' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        Vence hoy
                      </span>
                    ) : client.status === 'due_soon' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                        Por vencer
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        Al día
                      </span>
                    )}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Base:</span>{' '}
                        {client.oldestBaseDate ? new Date(client.oldestBaseDate).toLocaleDateString() : 'Sin fecha'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Vence:</span>{' '}
                        {client.nearestDueDate ? new Date(client.nearestDueDate).toLocaleDateString() : 'Sin vencimiento'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      ${client.totalDebt.toLocaleString()}
                    </div>
                    {client.overdueDebt > 0 ? (
                      <div className="mt-0.5 text-xs font-medium text-red-500 dark:text-red-400">
                        ${client.overdueDebt.toLocaleString()} vencido
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Saldo total por cobrar
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canQuickPay && (
                        <Button 
                          size="sm" 
                          className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white border-none"
                          onClick={(e) => { e.stopPropagation(); onQuickPay(client); }}
                        >
                          <Wallet className="w-3 h-3 mr-1.5" />
                          Cobrar
                        </Button>
                      )}
                      {canSendReminder && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-green-600 opacity-0 group-hover:opacity-100 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                          onClick={(e) => { e.stopPropagation(); onWhatsApp(client); }}
                          title="Enviar recordatorio"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="app-icon-button h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); onSelectClient(client); }}
                        title="Ver detalle"
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
    </>
  );
};
