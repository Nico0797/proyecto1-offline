import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { usePaymentStore } from '../../store/paymentStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomerId?: number;
}

export const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { createPayment } = usePaymentStore();

  const [loading, setLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [customerDebt, setCustomerDebt] = useState<number | null>(null);

  useEffect(() => {
    if (activeBusiness && isOpen) {
      fetchCustomers(activeBusiness.id);
    }
  }, [activeBusiness, fetchCustomers, isOpen]);

  useEffect(() => {
    if (isOpen && initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else if (isOpen && !initialCustomerId) {
      setSelectedCustomerId('');
    }
  }, [initialCustomerId, isOpen]);

  useEffect(() => {
    const fetchDebt = async () => {
      if (!activeBusiness || !selectedCustomerId) {
        setCustomerDebt(null);
        return;
      }
      try {
        const res = await api.get(`/businesses/${activeBusiness.id}/customers/${selectedCustomerId}`);
        setCustomerDebt(res.data.customer.balance);
      } catch (err) {
        console.error('Error fetching customer debt:', err);
      }
    };

    fetchDebt();
  }, [activeBusiness, selectedCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedCustomerId) return;

    setLoading(true);
    try {
      await createPayment(activeBusiness.id, {
        customer_id: selectedCustomerId,
        amount: parseFloat(amount),
        method,
        note,
        payment_date: new Date().toISOString().split('T')[0],
      });

      setSelectedCustomerId('');
      setAmount('');
      setMethod('cash');
      setNote('');
      setCustomerDebt(null);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
          <select
            className="app-select"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value) || '')}
            required
          >
            <option value="">Seleccionar cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          {customerDebt !== null ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Deuda actual:{' '}
              <span className={customerDebt > 0 ? 'font-bold text-red-500' : 'font-bold text-green-500'}>
                ${customerDebt.toLocaleString()}
              </span>
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Monto</label>
          <CurrencyInput
            value={amount}
            onChange={(val) => setAmount(typeof val === 'number' ? String(val) : '')}
            required
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Metodo de pago</label>
          <select className="app-select" value={method} onChange={(e) => setMethod(e.target.value)}>
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
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nota (opcional)</label>
          <textarea
            className="min-h-[112px] w-full resize-none rounded-2xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Detalles del pago..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Guardando...' : 'Guardar pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
