import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useRecurringExpenseStore } from '../store/recurringExpenseStore';
import { Button } from '../components/ui/Button';
import { Plus, Search, Trash2, Calendar, CheckCircle, Clock, Edit2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { CreateRecurringExpenseModal } from '../components/Expenses/CreateRecurringExpenseModal';
import api from '../services/api';

export const RecurringExpenses = () => {
  const { activeBusiness } = useBusinessStore();
  const { recurringExpenses, loading, fetchRecurringExpenses, deleteRecurringExpense, updateRecurringExpense } = useRecurringExpenseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);

  useEffect(() => {
    if (activeBusiness) {
      fetchRecurringExpenses(activeBusiness.id);
    }
  }, [activeBusiness]);

  const filteredExpenses = recurringExpenses.filter((expense) =>
    expense.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto recurrente?')) {
      try {
        await deleteRecurringExpense(activeBusiness.id, id);
      } catch (error) {
        console.error('Error deleting recurring expense:', error);
      }
    }
  };

  const handleEdit = (expense: any) => {
    setExpenseToEdit(expense);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setExpenseToEdit(null);
    setIsModalOpen(true);
  };

  const postponeExpense = async (id: number, days: number) => {
    if (!activeBusiness) return;
    const expense = recurringExpenses.find(e => e.id === id);
    if (!expense) return;

    const currentDueDate = new Date(expense.next_due_date || new Date());
    currentDueDate.setDate(currentDueDate.getDate() + days);
    
    try {
      await updateRecurringExpense(activeBusiness.id, id, {
        ...expense,
        next_due_date: currentDueDate.toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error postponing expense:', error);
    }
  };

  const markAsPaid = async (id: number) => {
    if (!activeBusiness) return;
    const expense = recurringExpenses.find(e => e.id === id);
    if (!expense) return;

    // Create a real expense record
    try {
      await api.post(`/businesses/${activeBusiness.id}/expenses`, {
        description: expense.name,
        amount: expense.amount,
        category: expense.category || 'otros',
        expense_date: new Date().toISOString().split('T')[0],
        recurring_expense_id: id
      });

      // Update next due date (assume monthly for now or parse frequency)
      const currentDueDate = new Date(expense.next_due_date || new Date());
      if (expense.frequency === 'monthly') {
        currentDueDate.setMonth(currentDueDate.getMonth() + 1);
      } else if (expense.frequency === 'weekly') {
        currentDueDate.setDate(currentDueDate.getDate() + 7);
      } else if (expense.frequency === 'annual') {
        currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
      }

      await updateRecurringExpense(activeBusiness.id, id, {
        ...expense,
        next_due_date: currentDueDate.toISOString().split('T')[0]
      });
      
      alert('Gasto registrado y fecha actualizada.');
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
        case 'monthly': return 'Mensual';
        case 'weekly': return 'Semanal';
        case 'annual': return 'Anual';
        default: return freq;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gastos Recurrentes</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Nuevo Recurrente
        </Button>
      </div>

      <CreateRecurringExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => activeBusiness && fetchRecurringExpenses(activeBusiness.id)}
        expenseToEdit={expenseToEdit}
      />

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <Input
              placeholder="Buscar por descripción..."
              className="pl-10 bg-gray-50 dark:bg-gray-900/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-200 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Frecuencia</th>
                <th className="px-6 py-3">Próximo Pago</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && recurringExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    Cargando gastos recurrentes...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    No se encontraron gastos recurrentes.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {expense.name}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-white capitalize">
                      {expense.category || 'Recurrente'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-white capitalize">
                      {getFrequencyLabel(expense.frequency)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-white">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            {expense.next_due_date ? new Date(expense.next_due_date).toLocaleDateString() : '-'}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                      ${expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                         <button 
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Marcar como pagado"
                          onClick={() => markAsPaid(expense.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="Posponer 3 días"
                          onClick={() => postponeExpense(expense.id, 3)}
                        >
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] ml-0.5">+3</span>
                        </button>
                         <button 
                          className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="Posponer 7 días"
                          onClick={() => postponeExpense(expense.id, 7)}
                        >
                          <Clock className="w-4 h-4" />
                           <span className="text-[10px] ml-0.5">+7</span>
                        </button>
                        <button 
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
