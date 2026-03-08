import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { useExpenseStore } from '../../store/expenseStore';
import { Expense } from '../../types';
import { EXPENSE_CATEGORIES } from '../../utils/expenseCategories';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingExpense?: Expense | null;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingExpense,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addExpense } = useExpenseStore();

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: '',
    expense_date: (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description,
        amount: editingExpense.amount,
        category: editingExpense.category,
        expense_date: editingExpense.expense_date ? editingExpense.expense_date.split('T')[0] : '',
      });
    } else {
      setFormData({
        description: '',
        amount: 0,
        category: '',
        expense_date: (() => {
          const d = new Date();
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
      });
    }
  }, [editingExpense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    setLoading(true);
    try {
      if (editingExpense) {
        console.warn('Update expense not implemented in store yet');
      } else {
        await addExpense(activeBusiness.id, {
          description: formData.description,
          amount: Number(formData.amount),
          category: formData.category || 'otros',
          expense_date: formData.expense_date,
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Descripción"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          data-tour="expenses.modal.description"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Monto"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            required
            min="0"
            data-tour="expenses.modal.amount"
          />
          <Input
            label="Fecha"
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
            data-tour="expenses.modal.date"
          />
        </div>
        
        <div data-tour="expenses.modal.category">
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
        
        <div className="space-y-2" data-tour="expenses.modal.receipt">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjuntar Comprobante</label>
            <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading} data-tour="expenses.modal.confirm">{editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}</Button>
        </div>
      </form>
    </Modal>
  );
};
