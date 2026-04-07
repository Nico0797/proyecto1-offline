import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { RecurringExpense, useRecurringExpenseStore } from '../../store/recurringExpenseStore';
import { useDebtStore } from '../../store/debtStore';
import { useBusinessStore } from '../../store/businessStore';
import { formatCOP, getFrequencyLabel, getRecurringStatusColor, getRecurringStatusLabel, isDueSoon, isOverdue } from './helpers';
import { Button } from '../ui/Button';
import { Edit2, Trash2, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';
import { RecurringFormModal } from './RecurringFormModal';
import { useAccess } from '../../hooks/useAccess';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { TreasuryAccountSelect } from '../Treasury/TreasuryAccountSelect';

interface RecurringTabProps {
  recurringExpenses: RecurringExpense[];
  onRefresh: () => void;
}

export const RecurringTab: React.FC<RecurringTabProps> = ({ recurringExpenses, onRefresh }) => {
  const { activeBusiness } = useBusinessStore();
  const { deleteRecurringExpense, markRecurringAsPaid, generateRecurringDebt } = useRecurringExpenseStore();
  const { fetchSummary } = useDebtStore();
  const { hasPermission } = useAccess();
  const canCreate = hasPermission('expenses.create');
  const canUpdate = hasPermission('expenses.update');
  const canDelete = hasPermission('expenses.delete');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [expenseToExecute, setExpenseToExecute] = useState<RecurringExpense | null>(null);
  const [executionDate, setExecutionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [executionMethod, setExecutionMethod] = useState('cash');
  const [executionTreasuryAccountId, setExecutionTreasuryAccountId] = useState<number | null>(null);

  const handleEdit = (expense: RecurringExpense) => {
    if (!canUpdate) return;
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar esta programación recurrente?')) {
      try {
        await deleteRecurringExpense(activeBusiness.id, id);
        toast.success('Programación recurrente eliminada');
        onRefresh();
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'No se pudo eliminar la programación recurrente');
      }
    }
  };

  const handleExecuteRecurring = async (expense: RecurringExpense) => {
    if (!canCreate) return;
    if (!activeBusiness) return;
    const isPayable = (expense.payment_flow || 'cash') === 'payable';
    if (isPayable) {
      const confirmationMessage = `¿Generar cuenta por pagar por "${expense.name}" y mover el próximo vencimiento?`;
      if (!window.confirm(confirmationMessage)) return;
      try {
        const response = await generateRecurringDebt(activeBusiness.id, expense.id);
        if (response?.debt) {
          toast.success('Cuenta por pagar generada');
          await fetchSummary(activeBusiness.id);
        }
        onRefresh();
      } catch (error: any) {
        console.error('Error processing recurring payment', error);
        toast.error(error?.response?.data?.error || 'Error al procesar el recurrente');
      }
      return;
    }

    setExpenseToExecute(expense);
    setExecutionDate(new Date().toISOString().split('T')[0]);
    setExecutionMethod('cash');
    setExecutionTreasuryAccountId(null);
  };

  const handleConfirmExecuteRecurring = async () => {
    if (!activeBusiness || !expenseToExecute) return;
    try {
      await markRecurringAsPaid(activeBusiness.id, expenseToExecute.id, {
        expense_date: executionDate,
        payment_method: executionMethod,
        treasury_account_id: executionTreasuryAccountId,
        description: expenseToExecute.name,
      });
      toast.success('Salida recurrente registrada');
      setExpenseToExecute(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error processing recurring payment', error);
      toast.error(error?.response?.data?.error || 'Error al procesar el recurrente');
    }
  };

  // Sort by due date
  const sortedExpenses = [...recurringExpenses].sort((a, b) => {
      if (!a.next_due_date) return 1;
      if (!b.next_due_date) return -1;
      return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
  });
  const actionableExpenses = sortedExpenses.filter((expense) =>
    expense.is_active && (isOverdue(expense.next_due_date) || isDueSoon(expense.next_due_date))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Programación recurrente</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Aquí defines compromisos futuros: salida directa de caja o generación de cuenta por pagar.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>
            Nueva programación
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Agenda View (Upcoming) */}
         <div className="space-y-4">
             <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Programaciones por atender</h4>
             {actionableExpenses.map(expense => (
                 <div key={expense.id} className={`p-4 rounded-xl border ${isOverdue(expense.next_due_date) ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'} shadow-sm transition-all hover:shadow-md`}>
                     <div className="flex justify-between items-start mb-2">
                        <div>
                            <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {expense.name}
                                {isOverdue(expense.next_due_date) && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            </h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{expense.category} • {getFrequencyLabel(expense.frequency)} • {(expense.payment_flow || 'cash') === 'payable' ? 'Genera cuenta por pagar' : 'Salida directa de caja'}</p>
                            {expense.creditor_name ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Acreedor: {expense.creditor_name}</p>
                            ) : null}
                        </div>
                        <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getRecurringStatusColor(expense)} mb-1`}>
                                {getRecurringStatusLabel(expense)}
                            </span>
                            <p className="font-bold text-gray-900 dark:text-white">{formatCOP(expense.amount)}</p>
                        </div>
                     </div>
                     
                     <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700/50 mt-2">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            Vence: {expense.next_due_date ? new Date(expense.next_due_date).toLocaleDateString() : 'N/A'}
                        </div>
                        {canCreate ? (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => handleExecuteRecurring(expense)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> {(expense.payment_flow || 'cash') === 'payable' ? 'Generar cuenta por pagar' : 'Registrar salida'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Solo lectura</span>
                        )}
                     </div>
                 </div>
             ))}
             {actionableExpenses.length === 0 && (
                 <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                     No tienes programaciones recurrentes por atender en este momento.
                 </div>
             )}
         </div>

         {/* Full List / Config */}
         <div className="space-y-4">
             <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuración de programación</h4>
             <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                         <tr>
                             <th className="px-4 py-3">Nombre</th>
                             <th className="px-4 py-3">Monto</th>
                             <th className="px-4 py-3 text-center">Estado</th>
                             <th className="px-4 py-3 text-right">Acciones</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {sortedExpenses.map(expense => (
                             <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                 <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                    {expense.name}
                                    <div className="text-xs text-gray-500 font-normal">{getFrequencyLabel(expense.frequency)}</div>
                                    <div className="text-xs text-gray-500 font-normal">{(expense.payment_flow || 'cash') === 'payable' ? 'Genera cuenta por pagar' : 'Salida directa de caja'}</div>
                                    <div className="text-xs text-gray-500 font-normal">{expense.category}</div>
                                </td>
                                 <td className="px-4 py-3 text-gray-900 dark:text-white">
                                     {formatCOP(expense.amount)}
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                     <span className={`px-2 py-0.5 rounded-full text-xs ${expense.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                                         {expense.is_active ? 'Activo' : 'Inactivo'}
                                     </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                     {canUpdate || canDelete ? (
                                       <div className="flex justify-end gap-1">
                                           {canUpdate ? (
                                             <button onClick={() => handleEdit(expense)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                 <Edit2 className="w-4 h-4" />
                                             </button>
                                           ) : null}
                                           {canDelete ? (
                                             <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                                 <Trash2 className="w-4 h-4" />
                                             </button>
                                           ) : null}
                                       </div>
                                     ) : (
                                       <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Solo lectura</span>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>
      </div>

      <RecurringFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={onRefresh}
        editingExpense={editingExpense}
      />
      <Modal
        isOpen={!!expenseToExecute}
        onClose={() => setExpenseToExecute(null)}
        title={expenseToExecute ? `Registrar salida: ${expenseToExecute.name}` : 'Registrar salida'}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Monto a ejecutar</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {expenseToExecute ? formatCOP(expenseToExecute.amount) : '$0'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Método</label>
              <select
                className="app-select"
                value={executionMethod}
                onChange={(e) => setExecutionMethod(e.target.value)}
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>
          <TreasuryAccountSelect
            businessId={activeBusiness?.id}
            value={executionTreasuryAccountId}
            onChange={(value) => setExecutionTreasuryAccountId(value)}
            helperText="Elige la cuenta desde la que sale este pago recurrente."
          />
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setExpenseToExecute(null)}>
              Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleConfirmExecuteRecurring}>
              Registrar salida
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
