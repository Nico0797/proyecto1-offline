import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { FormAlert } from '../ui/FormAlert';
import { useBusinessStore } from '../../store/businessStore';
import { useExpenseStore } from '../../store/expenseStore';
import { Expense } from '../../types';
import { EXPENSE_CATEGORIES } from '../../utils/expenseCategories';
import { TreasuryAccountSelect } from '../Treasury/TreasuryAccountSelect';

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
  const { addExpense, updateExpense } = useExpenseStore();

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
    treasury_account_id: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description,
        amount: editingExpense.amount,
        category: editingExpense.category,
        expense_date: editingExpense.expense_date ? editingExpense.expense_date.split('T')[0] : '',
        treasury_account_id: editingExpense.treasury_account_id ?? null,
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
        treasury_account_id: null,
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
      if (editingExpense) {
        await updateExpense(activeBusiness.id, editingExpense.id, {
          description: formData.description,
          amount: Number(formData.amount),
          category: formData.category || 'otros',
          expense_date: formData.expense_date,
          treasury_account_id: formData.treasury_account_id,
        });
        toast.success('Gasto actualizado');
      } else {
        await addExpense(activeBusiness.id, {
          description: formData.description,
          amount: Number(formData.amount),
          category: formData.category || 'otros',
          expense_date: formData.expense_date,
          treasury_account_id: formData.treasury_account_id,
        });
        toast.success('Gasto registrado');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      setSubmitError(error?.response?.data?.error || 'No se pudo guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingExpense ? 'Editar gasto' : 'Registrar gasto'}>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {submitError ? (
          <FormAlert
            tone="error"
            title="No fue posible guardar el gasto"
            message={submitError}
          />
        ) : null}

        <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
          Usa este formulario para gastos que ya ocurrieron y realmente sacaron dinero de caja o banco.
        </div>
        <div className="space-y-3 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <Input
            label="¿En qué gastaste?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ej. transporte, compra de bolsas, pago de internet"
            required
            data-tour="expenses.modal.description"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Monto
            </label>
            <CurrencyInput
              value={formData.amount}
              onChange={(val) => setFormData({ ...formData, amount: val || 0 })}
              required
              placeholder="0.00"
              data-tour="expenses.modal.amount"
            />
          </div>
          <Input
            label="¿Cuándo salió el dinero?"
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
            data-tour="expenses.modal.date"
          />
        </div>
        
        <div className="space-y-3 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <div data-tour="expenses.modal.category">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de gasto</label>
            <select
              className="app-select"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Selecciona el tipo de gasto</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <TreasuryAccountSelect
            businessId={activeBusiness?.id}
            value={formData.treasury_account_id}
            onChange={(value) => setFormData({ ...formData, treasury_account_id: value })}
            helperText="Indica de dónde salió el dinero."
          />
        </div>
        
        <div className="space-y-2 rounded-[24px] border border-dashed border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40" data-tour="expenses.modal.receipt">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comprobante (opcional)</label>
            <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="w-full sm:w-auto" isLoading={loading} data-tour="expenses.modal.confirm">{editingExpense ? 'Guardar cambios' : 'Guardar gasto'}</Button>
        </div>
      </form>
    </Modal>
  );
};
