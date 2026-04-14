import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Appointment } from '../../types';
import { formatCOP } from './helpers';

interface CompleteAppointmentModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (data: {
    payment_method: string;
    amount_paid: number;
    treasury_account_id?: number | null;
  }) => void;
  isProcessing?: boolean;
}

export const CompleteAppointmentModal: React.FC<CompleteAppointmentModalProps> = ({
  appointment,
  onClose,
  onConfirm,
  isProcessing = false,
}) => {
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'credit'>('full');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (appointment) {
      setPaidAmount(String(appointment.price_snapshot));
      setPaymentType('full');
      setPaymentMethod('cash');
    }
  }, [appointment]);

  if (!appointment) return null;

  const total = appointment.price_snapshot;
  const employeeCommissionPercent = Number(appointment.employee_commission_percent || 0);
  const employeeCommissionAmount = employeeCommissionPercent > 0
    ? Number(((total * employeeCommissionPercent) / 100).toFixed(2))
    : Number(appointment.employee_commission_amount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalAmount = 0;
    if (paymentType === 'full') finalAmount = total;
    else if (paymentType === 'partial') finalAmount = parseFloat(paidAmount) || 0;

    onConfirm({
      payment_method: paymentMethod,
      amount_paid: finalAmount,
    });
  };

  const balance = total - (paymentType === 'full' ? total : paymentType === 'credit' ? 0 : (parseFloat(paidAmount) || 0));

  return (
    <Modal isOpen={!!appointment} onClose={onClose} title="Completar cita">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm app-text-muted">
          Al completar la cita se registrara una venta por el servicio <strong>{appointment.service_name_snapshot}</strong>.
        </p>

        <div className="app-surface-soft flex items-center justify-between rounded-2xl p-3">
          <span className="text-sm font-medium app-text-secondary">Total del servicio</span>
          <span className="text-lg font-bold app-text">{formatCOP(total)}</span>
        </div>

        {appointment.customer_name && (
          <div className="text-xs app-text-muted">
            Cliente: <span className="font-medium app-text">{appointment.customer_name}</span>
          </div>
        )}

        {appointment.employee_name_snapshot && employeeCommissionAmount > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Comision estimada para <strong>{appointment.employee_name_snapshot}</strong>: <strong>{formatCOP(employeeCommissionAmount)}</strong>
              {employeeCommissionPercent > 0 ? ` (${employeeCommissionPercent}%)` : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Tipo de pago</label>
            <select
              className="w-full app-surface border app-divider rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as any)}
            >
              <option value="full">Pago completo</option>
              <option value="partial">Pago parcial</option>
              <option value="credit">Fiado (credito)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Metodo de pago</label>
            <select
              className="w-full app-surface border app-divider rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={paymentType === 'credit'}
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

        {paymentType === 'partial' && (
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Monto pagado</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                className="pl-7"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                min={0}
                max={total}
              />
            </div>
          </div>
        )}

        {paymentType === 'credit' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Se creara una cuenta por cobrar por <strong>{formatCOP(total)}</strong>.
            </p>
          </div>
        )}

        {paymentType === 'partial' && balance > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Saldo pendiente: <strong>{formatCOP(Math.max(0, balance))}</strong>
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button type="submit" disabled={isProcessing}>{isProcessing ? 'Procesando...' : 'Completar y registrar venta'}</Button>
        </div>
      </form>
    </Modal>
  );
};
