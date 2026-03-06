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
import { RecurringFormModal } from '../components/Expenses/RecurringFormModal';
import { RecurringExpense } from '../store/recurringExpenseStore';
import { CategoriesTab } from '../components/Expenses/CategoriesTab';
import { ExpensesAnalyticsTab } from '../components/Expenses/ExpensesAnalyticsTab';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import { Expense } from '../types';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { DataTableContainer } from '../components/ui/DataTableContainer';
import { ProGate } from '../components/ui/ProGate';
import { FEATURES, FREE_LIMITS } from '../auth/plan';
import { SwipePager } from '../components/ui/SwipePager';

const DEFAULT_CATEGORIES = ['Servicios', 'Nómina', 'Arriendo', 'Insumos', 'Transporte', 'Marketing', 'Mantenimiento', 'Impuestos', 'Otros'];

export const Expenses = () => {
  const { activeBusiness } = useBusinessStore();
  const { expenses, loading: expensesLoading, fetchExpenses, deleteExpense } = useExpenseStore();
  const { recurringExpenses, fetchRecurringExpenses } = useRecurringExpenseStore();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<string>('movements');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('expenses'));
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);

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
    <div className="h-full flex flex-col overflow-hidden" data-tour="expenses.panel">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_EXPENSES}
      />
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 pt-safe">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gastos</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Controla tus egresos y pagos recurrentes.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setActiveTab('recurring')} data-tour="expenses.recurring">
                    <RefreshCw className="w-4 h-4 mr-2" /> Recurrentes
                </Button>
                {activeTab === 'recurring' ? (
                  <Button onClick={() => { setEditingRecurring(null); setIsRecurringModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Recurrente
                  </Button>
                ) : (
                  <Button onClick={handleNewExpense} data-tour="expenses.primaryAction">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Gasto
                  </Button>
                )}
            </div>
        </div>
      </div>

      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
            {
                id: 'movements',
                title: 'Movimientos',
                content: (
                    <div className="space-y-6">
                        <div data-tour="expenses.kpis">
                            <ExpensesKpis expenses={expenses} recurringExpenses={recurringExpenses} />
                        </div>
                        <div data-tour="expenses.filters">
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
                        <div data-tour="expenses.table" className="overflow-hidden">
                            <DataTableContainer>
                                <ExpensesTable 
                                    expenses={filteredExpenses}
                                    loading={expensesLoading}
                                    onEdit={(exp) => { setEditingExpense(exp); setIsCreateModalOpen(true); }}
                                    onDelete={handleDeleteExpense}
                                />
                            </DataTableContainer>
                        </div>
                    </div>
                )
            },
            {
                id: 'recurring',
                title: 'Recurrentes',
                badge: 'PRO',
                content: (
                    <ProGate feature={FEATURES.RECURRING_EXPENSES} mode="block">
                        <RecurringTab 
                            recurringExpenses={recurringExpenses}
                            onRefresh={() => activeBusiness && fetchRecurringExpenses(activeBusiness.id)}
                        />
                    </ProGate>
                )
            },
            {
                id: 'analytics',
                title: 'Analítica',
                content: <ExpensesAnalyticsTab expenses={filteredExpenses} />
            },
            {
                id: 'categories',
                title: 'Categorías',
                content: (
                    <CategoriesTab 
                        categories={customCategories}
                        onAddCategory={handleAddCategory}
                        onRemoveCategory={handleRemoveCategory}
                    />
                )
            }
        ]}
      />

      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => activeBusiness && fetchExpenses(activeBusiness.id, { start_date: dateRange.start, end_date: dateRange.end })}
        editingExpense={editingExpense}
      />
      <RecurringFormModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onSuccess={() => activeBusiness && fetchRecurringExpenses(activeBusiness.id)}
        editingExpense={editingRecurring}
      />
    </div>
  );
};
