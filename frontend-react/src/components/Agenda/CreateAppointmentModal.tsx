import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Appointment, Customer, Employee, ServiceItem } from '../../types';
import { formatCOP } from './helpers';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Appointment> & { service_id: number }) => void;
  services: ServiceItem[];
  employees: Employee[];
  customers: Customer[];
  editing?: Appointment | null;
  defaultDate?: string;
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  services,
  employees,
  customers,
  editing,
  defaultDate,
}) => {
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [priceOverride, setPriceOverride] = useState('');

  useEffect(() => {
    if (editing) {
      setServiceId(editing.service_id);
      setEmployeeId(editing.employee_id ?? '');
      setCustomerId(editing.customer_id ?? '');
      const startsDate = editing.starts_at.split('T')[0];
      setDate(startsDate);
      try {
        const d = new Date(editing.starts_at);
        setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } catch { setTime('09:00'); }
      const dur = editing.ends_at && editing.starts_at
        ? Math.round((new Date(editing.ends_at).getTime() - new Date(editing.starts_at).getTime()) / 60000)
        : 60;
      setDurationMinutes(dur > 0 ? dur : 60);
      setNotes(editing.notes ?? '');
      setPriceOverride(String(editing.price_snapshot ?? ''));
    } else {
      setServiceId('');
      setEmployeeId('');
      setCustomerId('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime('09:00');
      setDurationMinutes(60);
      setNotes('');
      setPriceOverride('');
    }
  }, [defaultDate, editing, isOpen]);

  const selectedService = services.find((s) => s.id === Number(serviceId));

  useEffect(() => {
    if (selectedService && !editing) {
      setDurationMinutes(selectedService.duration_minutes || 60);
      setPriceOverride(String(selectedService.price ?? 0));
    }
  }, [selectedService, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return;

    const startsAt = `${date}T${time}:00`;
    const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60000).toISOString();

    onSubmit({
      service_id: Number(serviceId),
      employee_id: employeeId ? Number(employeeId) : null,
      customer_id: customerId ? Number(customerId) : null,
      starts_at: startsAt,
      ends_at: endsAt,
      notes: notes.trim() || null,
      price_snapshot: parseFloat(priceOverride) || selectedService?.price || 0,
      duration_minutes: durationMinutes,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar cita' : 'Nueva cita'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Service */}
        <div>
          <label className="block text-sm font-medium app-text-secondary mb-1">Servicio *</label>
          <select
            className="w-full app-surface border app-divider rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            value={serviceId}
            onChange={(e) => setServiceId(Number(e.target.value) || '')}
            required
          >
            <option value="">Seleccionar servicio</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {formatCOP(s.price)} ({s.duration_minutes} min)</option>
            ))}
          </select>
        </div>

        {/* Customer */}
        <div>
          <label className="block text-sm font-medium app-text-secondary mb-1">Cliente</label>
          <select
            className="w-full app-surface border app-divider rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
            value={customerId}
            onChange={(e) => setCustomerId(Number(e.target.value) || '')}
          >
            <option value="">Sin cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Employee */}
        {employees.length > 0 && (
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Empleado</label>
            <select
              className="w-full app-surface border app-divider rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value) || '')}
            >
              <option value="">Sin asignar</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}{emp.role ? ` — ${emp.role}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Fecha *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Hora *</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        {/* Duration + Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Duracion (min)</label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
              min={5}
              step={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium app-text-secondary mb-1">Precio</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                className="pl-7"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium app-text-secondary mb-1">Notas</label>
          <textarea
            className="w-full app-surface border app-divider rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones, preferencias del cliente..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!serviceId}>{editing ? 'Guardar cambios' : 'Agendar cita'}</Button>
        </div>
      </form>
    </Modal>
  );
};
