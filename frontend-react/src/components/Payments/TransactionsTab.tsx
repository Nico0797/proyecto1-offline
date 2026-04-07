import React from 'react';
import { Payment } from '../../store/paymentStore';
import { Button } from '../ui/Button';
import { Eye, Edit2, Trash2, MessageCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { DataTableContainer } from '../Layout/PageLayout';
import { settingsService } from '../../services/settingsService';
import { useBusinessStore } from '../../store/businessStore';
import { getTreasuryAccountTypeLabel } from '../../utils/treasury';

interface TransactionsTabProps {
  payments: Payment[];
  loading: boolean;
  onView: (payment: Payment) => void;
  onEdit: (payment: Payment) => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  payments,
  loading,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}) => {
  const { activeBusiness } = useBusinessStore();

  const handleWhatsApp = (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBusiness) return;

    const templates = settingsService.getTemplates(activeBusiness.id);
    let message = templates.payment || 'Hola {cliente}, hemos recibido tu abono de ${monto} en {negocio}. Tu nuevo saldo es ${saldo}. ¡Gracias!';

    // Replace placeholders
    message = message.replace('{cliente}', payment.customer_name || 'Cliente');
    message = message.replace('{negocio}', activeBusiness.name);
    message = message.replace('{monto}', `$${payment.amount.toLocaleString()}`);
    // Note: We don't have the current balance here directly in the payment object, 
    // so we might need to omit it or fetch it. For now, let's assume we don't show balance if not available
    // or we could show "Consultar"
    message = message.replace('{saldo}', 'Consultar'); 
    message = message.replace('{fecha}', new Date(payment.payment_date).toLocaleDateString());

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const paymentMethodLabel = (method?: string) => {
    if (!method) return 'Sin método';
    if (method === 'cash') return 'Efectivo';
    if (method === 'transfer') return 'Transferencia';
    if (method === 'card') return 'Tarjeta';
    if (method === 'nequi') return 'Nequi';
    if (method === 'daviplata') return 'Daviplata';
    if (method === 'bancolombia') return 'Bancolombia';
    if (method === 'other') return 'Otro';
    return method;
  };

  if (loading && payments.length === 0) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando transacciones...</div>;
  }

  if (payments.length === 0) {
    return (
      <div className="app-empty-state flex flex-col items-center justify-center rounded-xl p-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sin transacciones en este período</h3>
        <p className="mt-2 max-w-sm text-center text-gray-500 dark:text-gray-400">
          Ajusta el filtro de fechas con el ícono de calendario para ver más resultados.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card List */}
      <div className="space-y-3 lg:hidden">
        {payments.map((payment) => (
            <div key={payment.id} className="app-surface p-4 active:scale-[0.99] transition-transform" onClick={() => onView(payment)}>
               <div className="flex justify-between items-start mb-2">
                   <div>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">{new Date(payment.payment_date).toLocaleDateString()}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{payment.customer_name || 'Desconocido'}</h3>
                   </div>
                   <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                    (payment.method || payment.payment_method) === 'transfer' 
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  )}>
                    {paymentMethodLabel(payment.method || payment.payment_method)}
                  </span>
               </div>
               
               <div className="flex justify-between items-end gap-3 border-t border-gray-200/80 pt-2.5 dark:border-gray-700/60">
                   <div className="min-w-0 flex-1">
                       <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{payment.note || '-'}</p>
                       {payment.treasury_account_name ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {payment.treasury_account_name} • {getTreasuryAccountTypeLabel(payment.treasury_account_type)}
                        </p>
                       ) : null}
                       <button 
                        className="mt-1.5 text-xs flex items-center text-green-600 dark:text-green-400 font-medium"
                        onClick={(e) => handleWhatsApp(payment, e)}
                       >
                         <MessageCircle className="w-3 h-3 mr-1" /> Enviar constancia
                       </button>
                       <div className="flex gap-2 mt-1.5">
                         {canEdit && (
                           <Button
                             size="sm"
                             variant="secondary"
                             className="h-8"
                             onClick={(e) => {
                               e.stopPropagation();
                               onEdit(payment);
                             }}
                           >
                             Editar
                           </Button>
                         )}
                         {canDelete && (
                           <Button
                             size="sm"
                             variant="ghost"
                             className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                             onClick={(e) => {
                               e.stopPropagation();
                               onDelete(payment.id);
                             }}
                           >
                             Eliminar
                           </Button>
                         )}
                       </div>
                   </div>
                   <div className="text-right">
                       <span className="text-xs text-gray-500 dark:text-gray-400">Monto</span>
                       <p className="text-base font-bold text-gray-900 dark:text-white">${payment.amount.toLocaleString()}</p>
                   </div>
               </div>
            </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <DataTableContainer>
            <table className="min-w-[860px] w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="app-table-head sticky top-0 z-10 text-xs uppercase font-medium tracking-wider shadow-sm">
                <tr>
                <th className="px-6 py-3.5">Cobro</th>
                <th className="px-6 py-3.5">Método / destino</th>
                <th className="px-6 py-3.5">Referencia / nota</th>
                <th className="px-6 py-3.5 text-right">Monto</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
                </tr>
            </thead>
            <tbody className="app-table-body divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((payment) => (
                    <tr key={payment.id} className="app-table-row group cursor-pointer" onClick={() => onView(payment)}>
                        <td className="px-6 py-3.5">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {payment.customer_name || 'Desconocido'}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span>
                                {payment.created_by_name
                                  ? `${payment.created_by_name}${payment.created_by_role ? ` · ${payment.created_by_role}` : ''}`
                                  : 'Histórico'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize w-fit",
                                (payment.method || payment.payment_method) === 'transfer' 
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              )}>
                                {paymentMethodLabel(payment.method || payment.payment_method)}
                              </span>
                              {payment.treasury_account_name ? (
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {payment.treasury_account_name} • {getTreasuryAccountTypeLabel(payment.treasury_account_type)}
                                </span>
                              ) : null}
                            </div>
                        </td>
                        <td className="px-6 py-3.5 max-w-xs">
                          <div className="truncate text-gray-700 dark:text-gray-300" title={payment.note || undefined}>
                            {payment.note || 'Sin referencia registrada'}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                        <div className="font-bold text-gray-900 dark:text-white">${payment.amount.toLocaleString()}</div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Valor recibido</div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="app-inline-action h-8 px-3 text-blue-600 hover:text-blue-700 dark:text-blue-400" onClick={(e) => { e.stopPropagation(); onView(payment); }}>
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 opacity-0 group-hover:opacity-100 dark:text-green-400 dark:hover:bg-green-900/20" onClick={(e) => handleWhatsApp(payment, e)} title="Enviar constancia">
                                <MessageCircle className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onEdit(payment); }}>
                              <Edit2 className="w-4 h-4 text-gray-500" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 dark:text-red-400 dark:hover:bg-red-900/20" 
                              onClick={(e) => { e.stopPropagation(); onDelete(payment.id); }}
                              >
                              <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </DataTableContainer>
      </div>
    </>
  );
};
