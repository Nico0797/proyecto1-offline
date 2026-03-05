import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Order } from '../../store/orderStore';

interface CompleteOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: (date: string) => void;
}

export const CompleteOrderModal: React.FC<CompleteOrderModalProps> = ({
  order,
  onClose,
  onConfirm,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(date);
  };

  return (
    <Modal isOpen={!!order} onClose={onClose} title="Completar Pedido">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Vas a marcar el pedido <strong>#{order.order_number || order.id}</strong> como completado.
            Esto generará una venta automáticamente y descontará el stock.
          </p>
          
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha de finalización (para la venta)
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]} 
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Confirmar y Completar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
