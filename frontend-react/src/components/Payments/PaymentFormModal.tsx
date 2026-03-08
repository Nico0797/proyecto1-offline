import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { usePaymentStore, Payment } from '../../store/paymentStore';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  mode?: 'view' | 'edit';
  onSuccess: () => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  payment,
  mode = 'view',
  onSuccess
}) => {
  const { activeBusiness } = useBusinessStore();
  const { updatePayment, loading } = usePaymentStore();
  const [isEditing, setIsEditing] = useState(mode === 'edit');

  const initial = useMemo(() => {
    if (!payment) {
      return {
        amount: '',
        method: 'cash' as 'cash' | 'transfer',
        date: '',
        note: ''
      };
    }
    const d = new Date(payment.payment_date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
      amount: String(payment.amount),
      method: payment.method,
      date: `${yyyy}-${mm}-${dd}`,
      note: payment.note || ''
    };
  }, [payment]);

  const [amount, setAmount] = useState(initial.amount);
  const [method, setMethod] = useState<'cash' | 'transfer'>(initial.method);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);

  useEffect(() => {
    setIsEditing(mode === 'edit');
    setAmount(initial.amount);
    setMethod(initial.method);
    setDate(initial.date);
    setNote(initial.note);
  }, [initial, mode, isOpen]);

  const title = payment ? 'Transacción de Pago' : 'Pago';

  const handleSave = async () => {
    if (!activeBusiness || !payment) return;
    const amountNum = parseFloat(amount || '0');
    if (!amountNum || amountNum <= 0) return;
    try {
      await updatePayment(activeBusiness.id, payment.id, {
        amount: amountNum,
        method,
        payment_date: date,
        note
      } as any);
      onSuccess();
      onClose();
    } catch (e) {
      // Optional: surface error to user in the future
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const readOnly = !isEditing;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="max-w-full sm:max-w-lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Cliente"
            value={payment?.customer_name || 'Desconocido'}
            disabled
          />
          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Monto"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={readOnly}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Método
            </label>
            <select
              className="w-full px-3 py-2 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'cash' | 'transfer')}
              disabled={readOnly}
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nota / Referencia
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          {!isEditing ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setAmount(initial.amount);
                  setMethod(initial.method);
                  setDate(initial.date);
                  setNote(initial.note);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading || !amount}>
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

