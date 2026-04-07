import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { useRecurringExpenseStore, RecurringExpense } from '../../store/recurringExpenseStore';
import { EXPENSE_CATEGORIES } from '../../utils/expenseCategories';

interface RecurringFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingExpense?: RecurringExpense | null;
}

export const RecurringFormModal: React.FC<RecurringFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingExpense,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addRecurringExpense, updateRecurringExpense } = useRecurringExpenseStore();

  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    category: '',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'biweekly' | 'annual',
    payment_flow: 'cash' as 'cash' | 'payable',
    creditor_name: '',
    next_due_date: new Date().toISOString().split('T')[0],
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        name: editingExpense.name,
        amount: editingExpense.amount,
        category: editingExpense.category,
        frequency: editingExpense.frequency,
        payment_flow: editingExpense.payment_flow || 'cash',
        creditor_name: editingExpense.creditor_name || '',
        next_due_date: editingExpense.next_due_date ? new Date(editingExpense.next_due_date).toISOString().split('T')[0] : '',
        is_active: editingExpense.is_active,
      });
    } else {
      setFormData({
        name: '',
        amount: 0,
        category: '',
        frequency: 'monthly',
        payment_flow: 'cash',
        creditor_name: '',
        next_due_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });
    }
    setSubmitError(null);
  }, [editingExpense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    setLoading(true);
    setSubmitError(null);
    try {
      const due_day = new Date(formData.next_due_date).getDate();

      const data = {
        name: formData.name,
        amount: Number(formData.amount),
        category: formData.category || 'otros',
        frequency: formData.frequency,
        payment_flow: formData.payment_flow,
        creditor_name: formData.payment_flow === 'payable' ? formData.creditor_name || null : null,
        next_due_date: formData.next_due_date,
        is_active: formData.is_active,
        due_day,
      };

      if (editingExpense) {
        await updateRecurringExpense(activeBusiness.id, editingExpense.id, data);
        toast.success('Programación recurrente actualizada');
      } else {
        await addRecurringExpense(activeBusiness.id, data);
        toast.success('Programación recurrente creada');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      setSubmitError(error?.response?.data?.error || 'No se pudo guardar la programación recurrente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingExpense ? 'Editar programación recurrente' : 'Nueva programación recurrente'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError ? (
          <FormAlert
            tone="error"
            title="No fue posible guardar la programación"
            message={submitError}
          />
        ) : null}

        <Input
          label="Nombre / Descripción"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Monto Estimado"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            required
            min="0"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frecuencia</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'monthly' | 'weekly' | 'biweekly' | 'annual' })}
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flujo</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.payment_flow}
              onChange={(e) => setFormData({ ...formData, payment_flow: e.target.value as 'cash' | 'payable' })}
            >
              <option value="cash">Salida directa de caja</option>
              <option value="payable">Genera cuenta por pagar</option>
            </select>
          </div>
          {formData.payment_flow === 'payable' && (
            <Input
              label="Acreedor / Proveedor"
              value={formData.creditor_name}
              onChange={(e) => setFormData({ ...formData, creditor_name: e.target.value })}
              placeholder="Ej: proveedor, banco, arrendador"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Próximo Vencimiento"
            type="date"
            value={formData.next_due_date}
            onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            <option value="">Seleccionar categoría</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>{editingExpense ? 'Guardar cambios' : 'Guardar programación'}</Button>
        </div>
      </form>
    </Modal>
  );
};
