import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useDebtStore } from '../../store/debtStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Debt } from '../../types/debts';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: Debt;
}

const DEBT_CATEGORIES = [
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'tarjetas', label: 'Tarjetas de Crédito' },
  { value: 'prestamos', label: 'Préstamos' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'otros', label: 'Otras Obligaciones' },
];

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  debtToEdit,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addDebt, updateDebt } = useDebtStore();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    creditor_name: '',
    category: '',
    total_amount: '',
    balance_due: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    frequency: 'unique' as 'unique' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual',
    status: 'pending' as 'pending' | 'partial' | 'paid' | 'overdue',
    notes: '',
    reminder_enabled: false,
    interest_rate: '',
    installments: '',
    estimated_installment: '',
  });

  useEffect(() => {
    if (debtToEdit) {
      setFormData({
        name: debtToEdit.name,
        creditor_name: debtToEdit.creditor_name || '',
        category: debtToEdit.category || '',
        total_amount: debtToEdit.total_amount.toString(),
        balance_due: debtToEdit.balance_due.toString(),
        start_date: debtToEdit.start_date || '',
        due_date: debtToEdit.due_date || '',
        frequency: debtToEdit.frequency || 'unique',
        status: debtToEdit.status,
        notes: debtToEdit.notes || '',
        reminder_enabled: debtToEdit.reminder_enabled,
        interest_rate: debtToEdit.interest_rate?.toString() || '',
        installments: debtToEdit.installments?.toString() || '',
        estimated_installment: debtToEdit.estimated_installment?.toString() || '',
      });
      setShowAdvanced(true); // Always show advanced when editing
    } else {
      setFormData({
        name: '',
        creditor_name: '',
        category: '',
        total_amount: '',
        balance_due: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        frequency: 'unique',
        status: 'pending',
        notes: '',
        reminder_enabled: false,
        interest_rate: '',
        installments: '',
        estimated_installment: '',
      });
      setShowAdvanced(false); // Default to simple for new
    }
  }, [debtToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    try {
      // Auto-fill name if empty
      const finalName = formData.name.trim() || formData.creditor_name || 'Nueva Deuda';
      
      const data: Partial<Debt> = {
        name: finalName,
        creditor_name: formData.creditor_name,
        category: formData.category,
        total_amount: parseFloat(formData.total_amount),
        balance_due: formData.balance_due ? parseFloat(formData.balance_due) : parseFloat(formData.total_amount),
        start_date: formData.start_date,
        due_date: formData.due_date || undefined,
        frequency: formData.frequency,
        status: formData.status,
        notes: formData.notes,
        reminder_enabled: formData.reminder_enabled,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
        installments: formData.installments ? parseInt(formData.installments) : undefined,
        estimated_installment: formData.estimated_installment ? parseFloat(formData.estimated_installment) : undefined,
      };

      if (debtToEdit) {
        await updateDebt(activeBusiness.id, debtToEdit.id, data);
      } else {
        await addDebt(activeBusiness.id, data);
      }
      onClose();
    } catch (error) {
      console.error('Error saving debt:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Simple Mode Fields (Always Visible) */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            ¿A quién le debes? *
          </label>
          <Input
            value={formData.creditor_name}
            onChange={(e) => setFormData({ ...formData, creditor_name: e.target.value })}
            placeholder="Ej: Banco X, Proveedor Y, Juan Pérez"
            required={!formData.name} // Either name or creditor is required effectively
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Monto Total *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => {
                    const val = e.target.value;
                    // If creating new, auto-fill balance due
                    if (!debtToEdit && (!formData.balance_due || formData.balance_due === formData.total_amount)) {
                        setFormData({ ...formData, total_amount: val, balance_due: val });
                    } else {
                        setFormData({ ...formData, total_amount: val });
                    }
                }}
                required
                placeholder="0.00"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Vencimiento *
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
            Categoría (Opcional)
            </label>
            <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
            <option value="">Seleccionar...</option>
            {DEBT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
            ))}
            </select>
        </div>

        {/* Toggle Advanced */}
        <div className="pt-2">
            <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-blue-500 hover:text-blue-400 font-medium"
            >
                {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showAdvanced ? 'Ocultar opciones avanzadas' : 'Configuración avanzada'}
            </button>
        </div>

        {/* Advanced Fields */}
        {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Título / Nombre (Opcional)
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Préstamo Libre Inversión (opcional)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Si lo dejas vacío, se usará el nombre del acreedor.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Saldo Pendiente
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.balance_due}
                            onChange={(e) => setFormData({ ...formData, balance_due: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Estado
                        </label>
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="pending">Pendiente</option>
                            <option value="partial">Parcial</option>
                            <option value="paid">Pagada</option>
                            <option value="overdue">Vencida</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Fecha Inicio
                    </label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Periodicidad
                    </label>
                    <select
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    >
                        <option value="unique">Única vez</option>
                        <option value="weekly">Semanal</option>
                        <option value="biweekly">Quincenal</option>
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Interés %</label>
                        <Input type="number" step="0.01" placeholder="%" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cuotas</label>
                        <Input type="number" placeholder="#" value={formData.installments} onChange={e => setFormData({...formData, installments: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor Cuota</label>
                        <Input type="number" placeholder="$" value={formData.estimated_installment} onChange={e => setFormData({...formData, estimated_installment: e.target.value})} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Notas
                    </label>
                    <textarea
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Detalles adicionales..."
                    />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reminder_enabled"
                    checked={formData.reminder_enabled}
                    onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="reminder_enabled" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
                    Activar recordatorios
                  </label>
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-2">
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
            {loading ? 'Guardando...' : debtToEdit ? 'Guardar Cambios' : 'Crear Deuda'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
