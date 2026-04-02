import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useBusinessStore } from '../store/businessStore';
import { useExpenseStore } from '../store/expenseStore';
import { useRecurringExpenseStore } from '../store/recurringExpenseStore';
import { useDebtStore } from '../store/debtStore';
import { supplierPayablesService } from '../services/supplierPayablesService';
import { Button } from '../components/ui/Button';
import { Plus, RefreshCw, ClipboardList, PieChart, Tags, CreditCard } from 'lucide-react';
import { ExpensesKpis } from '../components/Expenses/ExpensesKpis';
import { ExpensesToolbar } from '../components/Expenses/ExpensesToolbar';
import { ExpensesTable } from '../components/Expenses/ExpensesTable';
import { CreateExpenseModal } from '../components/Expenses/CreateExpenseModal';
import { RecurringTab } from '../components/Expenses/RecurringTab';
import { PayablesTab } from '../components/Expenses/PayablesTab';
import { CategoriesTab } from '../components/Expenses/CategoriesTab';
import { ExpensesAnalyticsTab } from '../components/Expenses/ExpensesAnalyticsTab';
import { Expense, SupplierPayable } from '../types';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { ProGate } from '../components/ui/ProGate';
import { FEATURES } from '../auth/plan';
import { SwipePager } from '../components/ui/SwipePager';
import { useAccess } from '../hooks/useAccess';
import { ContentSection, PageHeader, PageLayout, PageNotice, PageStack, SectionStack, SummarySection, ToolbarSection } from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';

const DEFAULT_CATEGORIES = ['Servicios', 'Nómina', 'Arriendo', 'Insumos', 'Transporte', 'Marketing', 'Mantenimiento', 'Impuestos', 'Otros'];
const EXPENSE_TABS = ['movements', 'recurring', 'payables', 'analytics', 'categories'] as const;
type ExpenseTabId = typeof EXPENSE_TABS[number];
const normalizeExpenseTab = (tab: string | null): ExpenseTabId =>
  EXPENSE_TABS.includes(tab as ExpenseTabId) ? (tab as ExpenseTabId) : 'movements';

export const Expenses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeBusiness } = useBusinessStore();
  const { hasPermission, hasModule } = useAccess();
  const { expenses, loading: expensesLoading, fetchExpenses, deleteExpense } = useExpenseStore();
  const { recurringExpenses, fetchRecurringExpenses } = useRecurringExpenseStore();
  const { summary: debtsSummary, fetchSummary } = useDebtStore();
  const canCreate = hasPermission('expenses.create');
  const canUpdate = hasPermission('expenses.update');
  const canDelete = hasPermission('expenses.delete');
  const supportsRecurringExpenses = isBackendCapabilitySupported('recurring_expenses');
  const supportsSupplierPayables = isBackendCapabilitySupported('supplier_payables');
  const canReadSupplierPayables = supportsSupplierPayables && hasModule('raw_inventory') && hasPermission('supplier_payables.read');
  
  const [activeTab, setActiveTab] = useState<ExpenseTabId>(() => normalizeExpenseTab(searchParams.get('tab')));
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('expenses'));
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>([]);

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
      if (supportsRecurringExpenses) {
        fetchRecurringExpenses(activeBusiness.id);
      }
      fetchSummary(activeBusiness.id, 'operational');
    }
  }, [activeBusiness, dateRange.start, dateRange.end, fetchExpenses, fetchRecurringExpenses, fetchSummary, supportsRecurringExpenses]);

  useEffect(() => {
    if (!activeBusiness || !canReadSupplierPayables) {
      setSupplierPayables([]);
      return;
    }

    let cancelled = false;
    supplierPayablesService.list(activeBusiness.id)
      .then((result) => {
        if (!cancelled) {
          setSupplierPayables(result.supplier_payables || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupplierPayables([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeBusiness, canReadSupplierPayables]);

  useEffect(() => {
    const nextTab = normalizeExpenseTab(searchParams.get('tab'));
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [searchParams]);

  useEffect(() => {
    if (!supportsRecurringExpenses && activeTab === 'recurring') {
      handleTabChange('movements');
    }
  }, [activeTab, supportsRecurringExpenses]);

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
        toast.success('Gasto eliminado');
      } catch (error: any) {
        console.error('Error deleting expense:', error);
        toast.error(error?.response?.data?.error || 'No se pudo eliminar el gasto');
      }
    }
  };

  const handleTabChange = (nextTab: ExpenseTabId) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'movements') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
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
      const start = new Date(dateRange.start);
      matchesDate = matchesDate && new Date(expense.expense_date) >= start;
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23,59,59,999);
      matchesDate = matchesDate && new Date(expense.expense_date) <= end;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const handleNewExpense = () => {
    setEditingExpense(null);
    setIsCreateModalOpen(true);
  };

  const pageTitle = useMemo(() => {
    if (activeTab === 'movements') return 'Gastos del día a día';
    if (activeTab === 'recurring') return 'Pagos programados';
    if (activeTab === 'payables') return 'Pendientes por pagar';
    return 'Gastos y pagos';
  }, [activeTab]);

  const pageDescription = useMemo(() => {
    if (activeTab === 'movements') return 'Registra lo que ya salió de caja y mantén claro en qué se fue el dinero.';
    if (activeTab === 'recurring') return 'Deja listos pagos futuros sin mezclarlos con movimientos que todavía no ocurrieron.';
    if (activeTab === 'payables') return 'Revisa lo que debes, lo que está por vencer y los pagos ya registrados.';
    return 'Controla gastos, pagos y pendientes desde un mismo lugar.';
  }, [activeTab]);

  const hasMovementFilters = searchTerm.trim().length > 0 || categoryFilter !== 'all';
  const movementFilterSummary = hasMovementFilters ? 'Con filtros activos' : 'Buscar y filtrar';
  const movementSummaryLabel = `${filteredExpenses.length} gasto(s)`;
  const movementMobileFilters = useMobileFilterDraft({
    value: { searchTerm, categoryFilter, dateRange },
    onApply: (nextValue) => {
      setSearchTerm(nextValue.searchTerm);
      setCategoryFilter(nextValue.categoryFilter);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      searchTerm: '',
      categoryFilter: 'all',
      dateRange: getPeriodPreference('expenses'),
    }),
  });

  const expensePages = [
    {
      id: 'movements',
      title: 'Gastos',
      icon: ClipboardList,
      content: (
        <SectionStack>
          <div className="hidden lg:block">
            <PageStack>
              <PageNotice
                description="Registra aquí solo salidas que ya ocurrieron. Lo programado y lo pendiente quedan aparte para no mezclar decisiones."
                dismissible
              />
              <SummarySection title="Resumen rápido" description="Mira el gasto actual antes de entrar a la lista detallada.">
                <div data-tour="expenses.kpis">
                  <ExpensesKpis
                    expenses={expenses}
                    recurringExpenses={recurringExpenses}
                    debtsSummary={debtsSummary}
                    supplierPayables={supplierPayables}
                  />
                </div>
              </SummarySection>
              <ToolbarSection data-tour="expenses.filters">
                <ExpensesToolbar
                  search={searchTerm}
                  onSearchChange={setSearchTerm}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  categories={customCategories}
                />
              </ToolbarSection>
            </PageStack>
          </div>

          <ContentSection>
            <MobileUnifiedPageShell
            utilityBar={(
              <MobileUtilityBar>
                <MobileFilterDrawer summary={movementFilterSummary} {...movementMobileFilters.sheetProps}>
                  <ExpensesToolbar
                    search={movementMobileFilters.draft.searchTerm}
                    onSearchChange={(value) => movementMobileFilters.setDraft((current) => ({ ...current, searchTerm: value }))}
                    categoryFilter={movementMobileFilters.draft.categoryFilter}
                    onCategoryFilterChange={(value) => movementMobileFilters.setDraft((current) => ({ ...current, categoryFilter: value }))}
                    dateRange={movementMobileFilters.draft.dateRange}
                    onDateRangeChange={(value) => movementMobileFilters.setDraft((current) => ({ ...current, dateRange: value }))}
                    categories={customCategories}
                  />
                </MobileFilterDrawer>
                <MobileSummaryDrawer summary={movementSummaryLabel}>
                  <div data-tour="expenses.kpis">
                    <ExpensesKpis
                      expenses={expenses}
                      recurringExpenses={recurringExpenses}
                      debtsSummary={debtsSummary}
                      supplierPayables={supplierPayables}
                    />
                  </div>
                </MobileSummaryDrawer>
                <MobileHelpDisclosure summary="Cómo registrar gastos">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Registra aquí solo salidas que ya ocurrieron. Lo programado y lo pendiente viven en otras vistas para no mezclar decisiones.
                  </p>
                </MobileHelpDisclosure>
              </MobileUtilityBar>
            )}
          >
            <div data-tour="expenses.table">
              <ExpensesTable
                expenses={filteredExpenses}
                loading={expensesLoading}
                canEdit={canUpdate}
                canDelete={canDelete}
                onCreate={canCreate ? handleNewExpense : undefined}
                onEdit={(exp) => { setEditingExpense(exp); setIsCreateModalOpen(true); }}
                onDelete={handleDeleteExpense}
              />
            </div>
            </MobileUnifiedPageShell>
          </ContentSection>
        </SectionStack>
      )
    },
    ...(supportsRecurringExpenses ? [{
      id: 'recurring',
      title: 'Programados',
      badge: 'PRO',
      icon: RefreshCw,
      content: (
        <ProGate feature={FEATURES.RECURRING_EXPENSES} mode="block">
          <RecurringTab
            recurringExpenses={recurringExpenses}
            onRefresh={() => activeBusiness && supportsRecurringExpenses && fetchRecurringExpenses(activeBusiness.id)}
          />
        </ProGate>
      )
    }] : []),
    {
      id: 'payables',
      title: 'Por pagar',
      badge: 'PRO',
      icon: CreditCard,
      content: (
        <ProGate feature={FEATURES.DEBTS} mode="block">
          <PayablesTab />
        </ProGate>
      )
    },
    {
      id: 'analytics',
      title: 'Análisis',
      badge: 'PRO',
      icon: PieChart,
      content: (
        <ProGate feature={FEATURES.REPORTS} mode="block">
          <ExpensesAnalyticsTab expenses={filteredExpenses} />
        </ProGate>
      )
    },
    {
      id: 'categories',
      title: 'Categorías',
      icon: Tags,
      content: (
        <CategoriesTab
          categories={customCategories}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
        />
      )
    }
  ];

  return (
    <PageLayout data-tour="expenses.panel">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        action={activeTab === 'movements' && canCreate ? (
          <Button onClick={handleNewExpense} className="w-full sm:w-auto" data-tour="expenses.primaryAction">
            <Plus className="w-4 h-4 mr-2" /> Registrar gasto
          </Button>
        ) : undefined}
      />

      <SwipePager 
        activePageId={activeTab}
        onPageChange={(pageId) => handleTabChange(pageId as ExpenseTabId)}
        className="flex-1"
        contentScroll="visible"
        pages={expensePages}
      />

      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => activeBusiness && fetchExpenses(activeBusiness.id, { start_date: dateRange.start, end_date: dateRange.end })}
        editingExpense={editingExpense}
      />
    </PageLayout>
  );
};
