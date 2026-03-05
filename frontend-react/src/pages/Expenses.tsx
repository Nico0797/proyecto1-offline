import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useExpenseStore } from '../store/expenseStore';
import { useRecurringExpenseStore } from '../store/recurringExpenseStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Plus, RefreshCw } from 'lucide-react';
import { ExpensesKpis } from '../components/Expenses/ExpensesKpis';
import { ExpensesToolbar } from '../components/Expenses/ExpensesToolbar';
import { ExpensesTable } from '../components/Expenses/ExpensesTable';
import { CreateExpenseModal } from '../components/Expenses/CreateExpenseModal';
import { RecurringTab } from '../components/Expenses/RecurringTab';
import { CategoriesTab } from '../components/Expenses/CategoriesTab';
import { ExpensesAnalyticsTab } from '../components/Expenses/ExpensesAnalyticsTab';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import { Expense } from '../types';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { DataTableContainer } from '../components/ui/DataTableContainer';
import { ProGate } from '../components/ui/ProGate';
import { FEATURES, FREE_LIMITS } from '../auth/plan';

const DEFAULT_CATEGORIES = ['Servicios', 'Nómina', 'Arriendo', 'Insumos', 'Transporte', 'Marketing', 'Mantenimiento', 'Impuestos', 'Otros'];

export const Expenses = () => {
  const { activeBusiness } = useBusinessStore();
  const { expenses, loading: expensesLoading, fetchExpenses, deleteExpense } = useExpenseStore();
  const { recurringExpenses, fetchRecurringExpenses } = useRecurringExpenseStore();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'movements' | 'recurring' | 'analytics' | 'categories'>('movements');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('expenses'));
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Local Categories
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
      const stored = localStorage.getItem('expense_categories');
      return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
  });

  useEffect(() => {
    if (activeBusiness) {
      fetchExpenses(activeBusiness.id, {
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      fetchRecurringExpenses(activeBusiness.id);
    }
  }, [activeBusiness, dateRange.start, dateRange.end]);

  useEffect(() => {
      localStorage.setItem('expense_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  const handleAddCategory = (cat: string) => {
      if (!customCategories.includes(cat)) {
          setCustomCategories([...customCategories, cat]);
      }
  };

  const handleRemoveCategory = (cat: string) => {
      setCustomCategories(customCategories.filter(c => c !== cat));
  };

  const handleDeleteExpense = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      try {
        await deleteExpense(activeBusiness.id, id);
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Fecha', 'Descripción', 'Categoría', 'Monto'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(e => [
        e.id,
        new Date(e.expense_date).toISOString().split('T')[0],
        `"${e.description}"`,
        e.category,
        e.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `gastos_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const description = expense.description || '';
    const category = expense.category || '';
    const matchesSearch = description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          category.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (categoryFilter !== 'all') matchesCategory = expense.category === categoryFilter;

    // Backend already filters by date, but we can keep this for safety if store has mixed data (unlikely with replace)
    // or if we want to support switching presets without refetch (not possible if we only fetch range)
    // So redundant but safe.
    let matchesDate = true;
    if (dateRange.start) {
        matchesDate = matchesDate && new Date(expense.expense_date) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
        matchesDate = matchesDate && new Date(expense.expense_date) <= new Date(dateRange.end);
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const handleNewExpense = () => {
    if (user?.plan === 'free' && expenses.length >= FREE_LIMITS.EXPENSES) {
      setShowUpgradeModal(true);
      return;
    }
    setEditingExpense(null);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col" data-tour="expenses.panel">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_EXPENSES}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gastos</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Controla tus egresos y pagos recurrentes.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setActiveTab('recurring')} data-tour="expenses.recurring">
                <RefreshCw className="w-4 h-4 mr-2" /> Recurrentes
            </Button>
            <Button onClick={handleNewExpense} data-tour="expenses.primaryAction">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Gasto
            </Button>
        </div>
      </div>

      <div data-tour="expenses.kpis" className="flex-shrink-0">
        <ExpensesKpis expenses={expenses} recurringExpenses={recurringExpenses} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0" data-tour="expenses.tabs">
        <div className="flex gap-6 overflow-x-auto">
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'movements' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('movements')}
          >
            Movimientos
          </button>
          <div className="relative">
            <button
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'recurring' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              onClick={() => setActiveTab('recurring')}
            >
              Recurrentes y Agenda
            </button>
            <span className="absolute -top-1 -right-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
              PRO
            </span>
          </div>
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analítica
          </button>
           <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('categories')}
          >
            Categorías
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === 'movements' && (
              <>
                <div className="flex-shrink-0" data-tour="expenses.filters">
                <ExpensesToolbar 
                    search={searchTerm}
                    onSearchChange={setSearchTerm}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    onExport={handleExport}
                    categories={customCategories}
                />
                </div>
                <div className="flex-1 min-h-0" data-tour="expenses.table">
                    <DataTableContainer>
                    <ExpensesTable 
                        expenses={filteredExpenses}
                        loading={expensesLoading}
                        onEdit={(exp) => { setEditingExpense(exp); setIsCreateModalOpen(true); }}
                        onDelete={handleDeleteExpense}
                    />
                    </DataTableContainer>
                </div>
              </>
          )}

          {activeTab === 'recurring' && (
              <div className="flex-1 overflow-y-auto">
                <ProGate feature={FEATURES.RECURRING_EXPENSES} mode="block">
                  <RecurringTab 
                      recurringExpenses={recurringExpenses}
                      onRefresh={() => activeBusiness && fetchRecurringExpenses(activeBusiness.id)}
                  />
                </ProGate>
              </div>
          )}

          {activeTab === 'analytics' && (
              <div className="flex-1 overflow-y-auto">
                  <ExpensesAnalyticsTab expenses={filteredExpenses} />
              </div>
          )}

           {activeTab === 'categories' && (
              <div className="flex-1 overflow-y-auto">
                  <CategoriesTab 
                      categories={customCategories}
                      onAddCategory={handleAddCategory}
                      onRemoveCategory={handleRemoveCategory}
                  />
              </div>
          )}
      </div>

      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => activeBusiness && fetchExpenses(activeBusiness.id, { start_date: dateRange.start, end_date: dateRange.end })}
        editingExpense={editingExpense}
      />
    </div>
  );
};
