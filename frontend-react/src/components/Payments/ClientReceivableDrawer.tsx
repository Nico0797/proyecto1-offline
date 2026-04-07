import React, { useState } from 'react';
import { ClientReceivable } from '../../utils/receivables.compute';
import { useBusinessStore } from '../../store/businessStore';
import { receivablesService } from '../../services/receivablesService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MessageSquare, Wallet, X, FileText, Calendar, Clock, Edit2, Save } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ClientReceivableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientReceivable | null;
  onQuickPay: (client: ClientReceivable) => void;
  onWhatsApp: (client: ClientReceivable) => void;
  onUpdated: () => void;
  canQuickPay: boolean;
  canSendReminder: boolean;
  canManageTerms: boolean;
}

export const ClientReceivableDrawer: React.FC<ClientReceivableDrawerProps> = ({
  isOpen,
  onClose,
  client,
  onQuickPay,
  onWhatsApp,
  onUpdated,
  canQuickPay,
  canSendReminder,
  canManageTerms
}) => {
  const { activeBusiness } = useBusinessStore();
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [termDays, setTermDays] = useState('');
  const [savingSaleId, setSavingSaleId] = useState<number | null>(null);

  if (!isOpen || !client) return null;

  const startEditing = (saleId: number, currentTermDays: number) => {
    setEditingSaleId(saleId);
    setTermDays(String(currentTermDays));
  };

  const handleSaveTerm = async (saleId: number) => {
    if (!activeBusiness) return;
    const nextTerm = Number(termDays);
    if (!Number.isInteger(nextTerm) || nextTerm < 0 || nextTerm > 365) {
      alert('Ingresa un plazo válido entre 0 y 365 días.');
      return;
    }

    try {
      setSavingSaleId(saleId);
      await receivablesService.updateTerm(activeBusiness.id, saleId, nextTerm);
      setEditingSaleId(null);
      setTermDays('');
      onUpdated();
    } catch (error) {
      console.error('Error updating receivable term', error);
      alert('No se pudo actualizar el plazo de esta cuenta.');
    } finally {
      setSavingSaleId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl pointer-events-auto transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{client.customerName}</h2>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <UserIcon className="w-4 h-4 mr-1" />
              ID: {client.customerId}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Saldo Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${client.totalDebt.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Vencido</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${client.overdueDebt.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Próximo venc.</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {client.nearestDueDate ? new Date(client.nearestDueDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {canQuickPay && (
              <Button 
                onClick={() => onQuickPay(client)}
                className="bg-green-600 hover:bg-green-700 text-white border-none shadow-sm py-6"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Registrar Abono
              </Button>
            )}
            {canSendReminder && (
              <Button 
                variant="secondary"
                onClick={() => onWhatsApp(client)}
                className="py-6 border-gray-200 dark:border-gray-700"
              >
                <MessageSquare className="w-5 h-5 mr-2 text-green-500" />
                WhatsApp
              </Button>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-400" />
              Cuentas Pendientes ({client.receivables.length})
            </h3>
            
            {client.receivables.length === 0 ? (
              <p className="text-gray-500 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No hay facturas pendientes.
              </p>
            ) : (
              <div className="space-y-3">
                {client.receivables.map((inv) => (
                  <div 
                    key={inv.sale_id} 
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-sm",
                      inv.status === 'overdue' 
                        ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" 
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">{inv.document_label}</span>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          Base: {new Date(inv.base_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          Vence: {new Date(inv.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 dark:text-white">${inv.pending_balance.toLocaleString()}</span>
                        <div className="text-xs text-gray-400 mt-1">abonado ${inv.total_paid.toLocaleString()} de ${inv.original_amount.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        inv.status === 'overdue'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : inv.status === 'due_today'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : inv.status === 'due_soon'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      )}>
                        {inv.status_label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {inv.status === 'overdue'
                          ? `${inv.days_overdue} días de mora`
                          : `${inv.days_until_due} días restantes`}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                      {canManageTerms && editingSaleId === inv.sale_id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="number"
                            value={termDays}
                            onChange={(e) => setTermDays(e.target.value)}
                            className="h-9"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveTerm(inv.sale_id)}
                            isLoading={savingSaleId === inv.sale_id}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingSaleId(null);
                              setTermDays('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : canManageTerms ? (
                        <>
                          <div className="text-xs text-gray-500">
                            Plazo actual: <span className="font-semibold text-gray-700 dark:text-gray-200">{inv.term_days} días</span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => startEditing(inv.sale_id, inv.term_days)}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Ajustar plazo
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Plazo actual: <span className="font-semibold text-gray-700 dark:text-gray-200">{inv.term_days} días</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
           <Button variant="ghost" className="w-full text-gray-500" onClick={onClose}>
             Cerrar Detalle
           </Button>
        </div>
      </div>
    </div>
  );
};

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
