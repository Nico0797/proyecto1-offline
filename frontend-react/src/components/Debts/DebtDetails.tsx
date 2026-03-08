import React, { useEffect, useState, useCallback } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useDebtStore } from '../../store/debtStore';
import { debtService } from '../../services/debtService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Debt, DebtPayment } from '../../types/debts';
import { formatCOP } from '../Expenses/helpers';
import { Trash2, Calendar, CreditCard, Edit2 } from 'lucide-react';

interface DebtDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  onEdit?: (debt: Debt) => void;
}

export const DebtDetails: React.FC<DebtDetailsProps> = ({
  isOpen,
  onClose,
  debt,
  onEdit,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { deletePayment } = useDebtStore();
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!activeBusiness || !isOpen) return;
    setLoading(true);
    try {
        const data = await debtService.getPayments(activeBusiness.id, debt.id);
        setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, isOpen, debt.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleDeletePayment = async (paymentId: number) => {
    if (!activeBusiness) return;
    if (!window.confirm('¿Estás seguro de eliminar este pago? El saldo de la deuda aumentará.')) return;
    
    try {
      await deletePayment(activeBusiness.id, debt.id, paymentId);
      loadPayments(); // Reload list
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle: ${debt.name}`}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        {/* Info Header */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative">
            {onEdit && (
                <button 
                    onClick={() => {
                        onClose();
                        onEdit(debt);
                    }}
                    className="absolute top-3 right-3 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Editar detalles avanzados"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm pr-8">
                <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Proveedor</div>
                    <div className="font-medium text-gray-900 dark:text-white truncate" title={debt.creditor_name}>{debt.creditor_name || '-'}</div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Categoría</div>
                    <div className="font-medium text-gray-900 dark:text-white truncate">{debt.category || '-'}</div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Total Deuda</div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatCOP(debt.total_amount)}</div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Saldo Pendiente</div>
                    <div className="font-bold text-red-600 dark:text-red-400">{formatCOP(debt.balance_due)}</div>
                </div>
                {debt.start_date && (
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">Fecha Inicio</div>
                        <div className="font-medium text-gray-900 dark:text-white">{debt.start_date}</div>
                    </div>
                )}
                {debt.due_date && (
                    <div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">Vencimiento</div>
                        <div className="font-medium text-gray-900 dark:text-white">{debt.due_date}</div>
                    </div>
                )}
                <div className="col-span-2">
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Estado</div>
                    <div className="font-medium text-gray-900 dark:text-white capitalize">{debt.status === 'paid' ? 'Pagada' : debt.status === 'partial' ? 'Parcial' : debt.status === 'overdue' ? 'Vencida' : 'Pendiente'}</div>
                </div>
                
                {/* Advanced details if present */}
                {(debt.interest_rate || debt.installments) && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 mt-2 border-t border-gray-200 dark:border-gray-700/50">
                        {debt.interest_rate && (
                            <div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">Interés</div>
                                <div className="font-medium text-gray-900 dark:text-white">{debt.interest_rate}%</div>
                            </div>
                        )}
                        {debt.installments && (
                            <div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">Cuotas</div>
                                <div className="font-medium text-gray-900 dark:text-white">{debt.installments}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {debt.notes && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notas</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 italic">{debt.notes}</div>
                </div>
            )}
        </div>

        {/* Payments History */}
        <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                Historial de Pagos
                {loading && <span className="text-xs text-gray-400 font-normal">(Cargando...)</span>}
            </h3>
            
            {!loading && payments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 text-sm">No hay pagos registrados aún.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {payments.map(payment => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">{formatCOP(payment.amount)}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-3 h-3" />
                                        <span>{payment.payment_date}</span>
                                        <span className="capitalize">• {payment.payment_method === 'cash' ? 'Efectivo' : payment.payment_method === 'transfer' ? 'Transferencia' : payment.payment_method}</span>
                                    </div>
                                    {payment.note && <div className="text-xs text-gray-400 mt-0.5 italic max-w-[200px] truncate">{payment.note}</div>}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeletePayment(payment.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar pago"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
                Cerrar
            </Button>
        </div>
      </div>
    </Modal>
  );
};
