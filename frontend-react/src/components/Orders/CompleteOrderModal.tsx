import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Order } from '../../store/orderStore';
import { formatCOP } from './helpers';

interface CompleteOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: (data: { 
    date: string; 
    paymentType: 'full' | 'partial' | 'credit';
    paidAmount: number;
    paymentMethod: string;
  }) => void;
}

export const CompleteOrderModal: React.FC<CompleteOrderModalProps> = ({
  order,
  onClose,
  onConfirm,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'credit'>('full');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (order) {
      setPaidAmount(order.total.toString());
    }
  }, [order]);

  if (!order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalAmount = 0;
    if (paymentType === 'full') {
        finalAmount = order.total;
    } else if (paymentType === 'partial') {
        finalAmount = parseFloat(paidAmount) || 0;
    } else {
        finalAmount = 0; // Credit means 0 paid now
    }

    onConfirm({
        date,
        paymentType,
        paidAmount: finalAmount,
        paymentMethod
    });
  };

  return (
    <Modal isOpen={!!order} onClose={onClose} title="Completar Pedido">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Vas a marcar el pedido <strong>#{order.order_number || order.id}</strong> como completado.
            Esto generará una venta y descontará el stock.
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4 flex justify-between items-center">
             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total del Pedido:</span>
             <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCOP(order.total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Venta
                </label>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    max={new Date().toISOString().split('T')[0]} 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Pago
                </label>
                <select
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                >
                    <option value="full">Pago Completo</option>
                    <option value="partial">Pago Parcial</option>
                    <option value="credit">Fiado (Crédito)</option>
                </select>
             </div>
          </div>

          {paymentType !== 'credit' && (
             <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Método de Pago
                        </label>
                        <select
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Monto a Pagar
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                                type="number"
                                className="pl-7"
                                value={paymentType === 'full' ? order.total : paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                disabled={paymentType === 'full'}
                                min={0}
                                max={order.total}
                            />
                        </div>
                    </div>
                </div>
             </div>
          )}
          
          {paymentType === 'credit' && (
             <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    El pedido se marcará como completado y se creará una cuenta por cobrar (Fiado) por el valor total de <strong>{formatCOP(order.total)}</strong>.
                </p>
             </div>
          )}

          {paymentType === 'partial' && (
             <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                    Se registrará un abono de <strong>{formatCOP(parseFloat(paidAmount) || 0)}</strong> y quedará un saldo pendiente de <strong>{formatCOP(order.total - (parseFloat(paidAmount) || 0))}</strong>.
                </p>
             </div>
          )}

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
