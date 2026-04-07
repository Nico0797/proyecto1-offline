import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useRecurringExpenseStore } from '../../store/recurringExpenseStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { EXPENSE_CATEGORIES } from '../../utils/expenseCategories';

interface CreateRecurringExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: any;
}

export const CreateRecurringExpenseModal: React.FC<CreateRecurringExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addRecurringExpense, updateRecurringExpense } = useRecurringExpenseStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as 'monthly' | 'weekly' | 'biweekly' | 'annual',
    next_due_date: '',
    is_active: true,
    category: '',
  });

  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        name: expenseToEdit.name,
        amount: expenseToEdit.amount.toString(),
        frequency: expenseToEdit.frequency as 'monthly' | 'weekly' | 'biweekly' | 'annual',
        next_due_date: expenseToEdit.next_due_date ? expenseToEdit.next_due_date.split('T')[0] : '',
        is_active: expenseToEdit.is_active,
        category: expenseToEdit.category || '',
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        frequency: 'monthly',
        next_due_date: new Date().toISOString().split('T')[0],
        is_active: true,
        category: '',
      });
    }
  }, [expenseToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        due_day: formData.next_due_date ? parseInt(formData.next_due_date.split('-')[2], 10) : 1,
        category: formData.category || 'otros',
      };

      if (expenseToEdit) {
        await updateRecurringExpense(activeBusiness.id, expenseToEdit.id, data);
      } else {
        await addRecurringExpense(activeBusiness.id, data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving recurring expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'Editar Gasto Recurrente' : 'Nuevo Gasto Recurrente'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre / Descripción
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ej: Alquiler Local"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Monto
          </label>
          <CurrencyInput
            value={formData.amount}
            onChange={(val) => setFormData({ ...formData, amount: val ? val.toString() : '' })}
            placeholder="0.00"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frecuencia
            </label>
            <select
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'monthly' | 'weekly' | 'biweekly' | 'annual' })}
            >
              <option value="monthly">Mensual</option>
              <option value="weekly">Semanal</option>
              <option value="annual">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Próxima Fecha
            </label>
            <Input
              type="date"
              value={formData.next_due_date}
              onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categoría
          </label>
          <select
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
            Gasto Activo (generar alertas)
          </label>
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
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
