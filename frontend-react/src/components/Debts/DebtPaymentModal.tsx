import React, { useState } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useDebtStore } from '../../store/debtStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Debt } from '../../types/debts';
import { formatCOP } from '../Expenses/helpers';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addPayment } = useDebtStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    try {
      await addPayment(activeBusiness.id, debt.id, {
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        note: formData.note,
      });
      onClose();
    } catch (error) {
      console.error('Error registering payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar Pago: ${debt.name}`}
    >
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
        <p className="font-medium">Saldo Pendiente: {formatCOP(debt.balance_due)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Monto a Pagar *
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            max={debt.balance_due}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Fecha de Pago
          </label>
          <Input
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Método de Pago
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
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

        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
                Nota (Opcional)
            </label>
            <textarea
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[60px]"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Referencia, comprobante, etc."
            />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
