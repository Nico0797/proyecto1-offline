import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { usePaymentStore, Payment } from '../../store/paymentStore';
import { TreasuryAccountSelect } from '../Treasury/TreasuryAccountSelect';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  mode?: 'view' | 'edit';
  onSuccess: () => void;
  canEdit?: boolean;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  payment,
  mode = 'view',
  onSuccess,
  canEdit = true,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { updatePayment, loading } = usePaymentStore();
  const [isEditing, setIsEditing] = useState(mode === 'edit');

  const initial = useMemo(() => {
    if (!payment) {
      return {
        amount: '',
        method: 'cash',
        date: '',
        note: '',
        treasuryAccountId: null as number | null,
      };
    }

    const d = new Date(payment.payment_date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    return {
      amount: String(payment.amount),
      method: payment.method || payment.payment_method || 'cash',
      date: `${yyyy}-${mm}-${dd}`,
      note: payment.note || '',
      treasuryAccountId: payment.treasury_account_id ?? null,
    };
  }, [payment]);

  const [amount, setAmount] = useState(initial.amount);
  const [method, setMethod] = useState<string>(initial.method);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);
  const [treasuryAccountId, setTreasuryAccountId] = useState<number | null>(initial.treasuryAccountId);

  useEffect(() => {
    setIsEditing(mode === 'edit');
    setAmount(initial.amount);
    setMethod(initial.method);
    setDate(initial.date);
    setNote(initial.note);
    setTreasuryAccountId(initial.treasuryAccountId);
  }, [initial, mode, isOpen]);

  const title = payment ? 'Transaccion de Pago' : 'Pago';

  const handleSave = async () => {
    if (!activeBusiness || !payment) return;

    const amountNum = parseFloat(amount || '0');
    if (!amountNum || amountNum <= 0) return;

    try {
      await updatePayment(activeBusiness.id, payment.id, {
        amount: amountNum,
        method,
        payment_date: date,
        treasury_account_id: treasuryAccountId,
        note,
      } as any);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
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
      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-[22px] border border-blue-200 bg-blue-50/90 px-4 py-3.5 text-sm text-blue-800 shadow-sm dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
          Revisa el monto, la fecha y la cuenta donde quedo registrado este cobro antes de guardar cambios.
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40 sm:grid-cols-2">
          <Input
            label="Monto"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={readOnly}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Metodo
            </label>
            <select
              className="app-select"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={readOnly}
            >
              <option value="cash">Efectivo</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="bancolombia">Bancolombia</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <TreasuryAccountSelect
            businessId={activeBusiness?.id}
            value={treasuryAccountId}
            onChange={(value) => setTreasuryAccountId(value)}
            disabled={readOnly}
            helperText="Cuenta donde ingreso este cobro."
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nota / Referencia
            </label>
            <textarea
              className="min-h-[104px] w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 disabled:opacity-50"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          {!isEditing ? (
            <>
              <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
                Cerrar
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => setIsEditing(true)} disabled={!canEdit}>
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsEditing(false);
                  setAmount(initial.amount);
                  setMethod(initial.method);
                  setDate(initial.date);
                  setNote(initial.note);
                  setTreasuryAccountId(initial.treasuryAccountId);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleSave} disabled={loading || !amount}>
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
