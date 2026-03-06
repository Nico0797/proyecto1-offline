import React, { useState } from 'react';
import { RecurringExpense, useRecurringExpenseStore } from '../../store/recurringExpenseStore';
import { useExpenseStore } from '../../store/expenseStore';
import { useBusinessStore } from '../../store/businessStore';
import { formatCOP, getFrequencyLabel, getRecurringStatusColor, getRecurringStatusLabel, calculateNextDate, isOverdue } from './helpers';
import { Button } from '../ui/Button';
import { Edit2, Trash2, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';
import { RecurringFormModal } from './RecurringFormModal';

interface RecurringTabProps {
  recurringExpenses: RecurringExpense[];
  onRefresh: () => void;
}

export const RecurringTab: React.FC<RecurringTabProps> = ({ recurringExpenses, onRefresh }) => {
  const { activeBusiness } = useBusinessStore();
  const { updateRecurringExpense, deleteRecurringExpense } = useRecurringExpenseStore();
  const { addExpense } = useExpenseStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto recurrente?')) {
      await deleteRecurringExpense(activeBusiness.id, id);
      onRefresh();
    }
  };

  const handleMarkAsPaid = async (expense: RecurringExpense) => {
    if (!activeBusiness) return;
    if (window.confirm(`¿Registrar pago de "${expense.name}" y actualizar próxima fecha?`)) {
      try {
        // 1. Create Expense Movement
        await addExpense(activeBusiness.id, {
          description: expense.name,
          amount: expense.amount,
          category: expense.category,
          expense_date: new Date().toISOString().split('T')[0], // Today
        });

        // 2. Update Next Due Date
        if (expense.next_due_date) {
            const nextDate = calculateNextDate(new Date(expense.next_due_date), expense.frequency);
            await updateRecurringExpense(activeBusiness.id, expense.id, {
                next_due_date: nextDate.toISOString().split('T')[0]
            });
        }
        
        onRefresh();
      } catch (error) {
        console.error('Error processing recurring payment', error);
        alert('Error al procesar el pago recurrente');
      }
    }
  };

  // Sort by due date
  const sortedExpenses = [...recurringExpenses].sort((a, b) => {
      if (!a.next_due_date) return 1;
      if (!b.next_due_date) return -1;
      return new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agenda de Pagos Recurrentes</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Agenda View (Upcoming) */}
         <div className="space-y-4">
             <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Próximos Vencimientos</h4>
             {sortedExpenses.filter(e => e.is_active).map(expense => (
                 <div key={expense.id} className={`p-4 rounded-xl border ${isOverdue(expense.next_due_date) ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'} shadow-sm transition-all hover:shadow-md`}>
                     <div className="flex justify-between items-start mb-2">
                        <div>
                            <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {expense.name}
                                {isOverdue(expense.next_due_date) && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            </h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{expense.category} • {getFrequencyLabel(expense.frequency)}</p>
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
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(expense)}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => handleMarkAsPaid(expense)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Pagar
                            </Button>
                        </div>
                     </div>
                 </div>
             ))}
             {sortedExpenses.filter(e => e.is_active).length === 0 && (
                 <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                     No tienes pagos recurrentes activos próximos.
                 </div>
             )}
         </div>

         {/* Full List / Config */}
         <div className="space-y-4">
             <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuración Total</h4>
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
                                     <div className="flex justify-end gap-1">
                                         <button onClick={() => handleEdit(expense)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                             <Edit2 className="w-4 h-4" />
                                         </button>
                                         <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     </div>
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
    </div>
  );
};
