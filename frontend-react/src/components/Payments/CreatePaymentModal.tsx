import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { usePaymentStore } from '../../store/paymentStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';

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
  }, [activeBusiness, isOpen]);

  useEffect(() => {
    if (isOpen && initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else if (isOpen && !initialCustomerId) {
      setSelectedCustomerId('');
    }
  }, [isOpen, initialCustomerId]);

  // Fetch customer debt when selected
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
  }, [selectedCustomerId, activeBusiness]);

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
        payment_date: new Date().toISOString().split('T')[0]
      });
      
      // Reset form
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Cliente
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
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
          {customerDebt !== null && (
            <p className="text-sm mt-1 text-gray-400">
              Deuda actual: <span className={customerDebt > 0 ? "text-red-400 font-bold" : "text-green-400"}>${customerDebt.toLocaleString()}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Monto
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Método de Pago
          </label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
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
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none h-20"
            placeholder="Detalles del pago..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
            {loading ? 'Guardando...' : 'Guardar Pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
