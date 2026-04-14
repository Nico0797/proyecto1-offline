import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Edit2, Check, X, Wallet } from 'lucide-react';
import type { Employee } from '../../types';

interface ManageEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onCreate: (data: Partial<Employee>) => void;
  onUpdate: (id: number, data: Partial<Employee>) => void;
  onRemove: (id: number) => void;
  onRegisterSalaryExpense?: (employee: Employee) => void;
}

export const ManageEmployeesModal: React.FC<ManageEmployeesModalProps> = ({
  isOpen,
  onClose,
  employees,
  onCreate,
  onUpdate,
  onRemove,
  onRegisterSalaryExpense,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState(true);
  const [color, setColor] = useState('#6366f1');
  const [compensationType, setCompensationType] = useState<'salary' | 'percentage'>('salary');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');

  const resetForm = () => {
    setName('');
    setPhone('');
    setRole('');
    setActive(true);
    setColor('#6366f1');
    setCompensationType('salary');
    setSalaryAmount('');
    setCommissionPercent('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      phone: phone.trim() || null,
      role: role.trim() || null,
      active,
      color: color || '#6366f1',
      compensation_type: compensationType,
      salary_amount: compensationType === 'salary' ? Number(salaryAmount || 0) || 0 : null,
      commission_percent: compensationType === 'percentage' ? Number(commissionPercent || 0) || 0 : null,
    };
    if (editingId) {
      onUpdate(editingId, data);
    } else {
      onCreate(data);
    }
    resetForm();
  };

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setName(employee.name);
    setPhone(employee.phone ?? '');
    setRole(employee.role ?? '');
    setActive(employee.active !== false);
    setColor(employee.color || '#6366f1');
    setCompensationType(employee.compensation_type === 'percentage' ? 'percentage' : 'salary');
    setSalaryAmount(employee.salary_amount != null ? String(employee.salary_amount) : '');
    setCommissionPercent(employee.commission_percent != null ? String(employee.commission_percent) : '');
    setShowForm(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Empleados" maxWidth="max-w-md">
      <div className="space-y-4">
        {employees.length === 0 && !showForm ? (
          <p className="py-6 text-center text-sm app-text-muted">No hay empleados registrados.</p>
        ) : null}

        {employees.map((employee) => (
          <div key={employee.id} className="flex items-center gap-3 rounded-2xl border app-divider px-3.5 py-2.5">
            <div
              className="h-8 w-8 shrink-0 rounded-full"
              style={{ backgroundColor: employee.color || '#6366f1' }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium app-text">{employee.name}</div>
              {(employee.role || employee.phone) ? (
                <div className="truncate text-xs app-text-muted">{[employee.role, employee.phone].filter(Boolean).join(' · ')}</div>
              ) : null}
              <div className="mt-1 truncate text-[11px] app-text-muted">
                {employee.active === false ? 'Inactivo' : 'Activo'}
              </div>
              <div className="mt-1 truncate text-[11px] app-text-muted">
                {employee.compensation_type === 'percentage'
                  ? `Comision ${Number(employee.commission_percent || 0)}% por servicio`
                  : `Sueldo fijo ${Number(employee.salary_amount || 0) > 0 ? `$${Number(employee.salary_amount || 0).toLocaleString('es-CO')}` : 'sin definir'}`}
              </div>
            </div>
            {employee.compensation_type !== 'percentage' && Number(employee.salary_amount || 0) > 0 && onRegisterSalaryExpense ? (
              <button
                type="button"
                title="Registrar sueldo en gastos"
                onClick={() => onRegisterSalaryExpense(employee)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-500 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <Wallet className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button type="button" onClick={() => startEdit(employee)} className="p-1 app-text-muted hover:app-text">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onRemove(employee.id)} className="p-1 text-red-500 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-2xl border app-divider p-3.5">
            <Input placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Rol" value={role} onChange={(e) => setRole(e.target.value)} />
              <Input placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs app-text-muted">
                <span className="block">Estado</span>
                <select
                  className="w-full rounded-xl border app-divider app-surface px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  value={active ? 'active' : 'inactive'}
                  onChange={(e) => setActive(e.target.value === 'active')}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
              <label className="space-y-1 text-xs app-text-muted">
                <span className="block">Color en agenda</span>
                <div className="flex items-center gap-2 rounded-xl border app-divider app-surface px-3 py-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-10 rounded-md border-0 bg-transparent p-0"
                  />
                  <span className="truncate text-sm app-text">{color}</span>
                </div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs app-text-muted">
                <span className="block">Pago al empleado</span>
                <select
                  className="w-full rounded-xl border app-divider app-surface px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  value={compensationType}
                  onChange={(e) => setCompensationType(e.target.value as 'salary' | 'percentage')}
                >
                  <option value="salary">Sueldo fijo</option>
                  <option value="percentage">Por porcentaje</option>
                </select>
              </label>
              {compensationType === 'salary' ? (
                <Input placeholder="Sueldo" type="number" min={0} value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
              ) : (
                <Input placeholder="% comision" type="number" min={0} max={100} value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} />
              )}
            </div>
            <p className="text-[11px] app-text-muted">
              Sueldo fijo se registra como gasto. Por porcentaje se descuenta como costo cuando completas la cita y se genera la venta.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3.5 w-3.5" /> Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {!showForm ? (
          <Button variant="outline" className="w-full" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Agregar empleado
          </Button>
        ) : null}
      </div>
    </Modal>
  );
};
