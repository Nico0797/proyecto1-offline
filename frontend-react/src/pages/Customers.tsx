import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../store/businessStore';
import { useCustomerStore } from '../store/customerStore';
import { useSaleStore } from '../store/saleStore';
import { ClientsKpis } from '../components/Customers/ClientsKpis';
import { ClientsToolbar } from '../components/Customers/ClientsToolbar';
import { ClientList } from '../components/Customers/ClientList';
import { ClientDetailPanel } from '../components/Customers/ClientDetailPanel';
import { ClientFormModal } from '../components/Customers/ClientFormModal';
import { CreditSettingsModal } from '../components/Customers/CreditSettingsModal';
import { Customer, isBusinessModuleEnabled } from '../types';
import { Button } from '../components/ui/Button';
import { UserPlus, Users, User, AlertCircle, Trophy } from 'lucide-react';
import { SwipePager } from '../components/ui/SwipePager';
import { TopCustomersCard } from '../components/Customers/TopCustomersCard';
import { ContentAnchor, PageLayout, PageHeader, PageHeaderActionButton, PageBody, PageNotice, PageStack, PageSummary, PageToolbarCard } from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileFilterSection,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';

const getCustomerOutstandingBalance = (customer: Customer) => {
  const summaryOutstanding = customer.commercial_summary?.outstanding_balance;
  if (typeof customer.total_balance === 'number') return customer.total_balance;
  if (typeof summaryOutstanding === 'number') return summaryOutstanding;
  return customer.balance || 0;
};

const normalizeCustomerBalance = (customer: Customer): Customer => {
  const normalizedBalance = getCustomerOutstandingBalance(customer);
  return {
    ...customer,
    balance: normalizedBalance,
    total_balance: normalizedBalance,
  };
};

export const Customers = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers, deleteCustomer } = useCustomerStore();
  const { sales } = useSaleStore();
  
  const [activeTab, setActiveTab] = useState<string>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [hydratedCustomers, setHydratedCustomers] = useState<Record<number, Customer>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // State for credit settings
  const [creditDays, setCreditDays] = useState(30);
  const hasAccountsReceivable = isBusinessModuleEnabled(activeBusiness?.modules, 'accounts_receivable');

  // Desktop check
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeBusiness) {
      fetchCustomers(activeBusiness.id);
      
      // Load credit settings
      const storedSettings = localStorage.getItem(`business_settings_${activeBusiness.id}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setCreditDays(settings.credit_days || 30);
      } else {
        setCreditDays(activeBusiness.credit_days || 30);
      }
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (!hasAccountsReceivable && ['debt', 'due_soon', 'overdue'].includes(filter)) {
      setFilter('all');
    }
  }, [hasAccountsReceivable, filter]);

  useEffect(() => {
    setHydratedCustomers({});
  }, [activeBusiness?.id]);

  const customersView = useMemo(
    () => customers.map((customer) => normalizeCustomerBalance({ ...customer, ...(hydratedCustomers[customer.id] || {}) })),
    [customers, hydratedCustomers]
  );

  useEffect(() => {
    if (!selectedCustomer) return;
    const refreshedCustomer = customersView.find((item) => item.id === selectedCustomer.id);
    if (!refreshedCustomer) return;
    if (refreshedCustomer !== selectedCustomer) {
      setSelectedCustomer(refreshedCustomer);
    }
  }, [customersView, selectedCustomer]);

  const handleCustomerHydrated = useCallback((customer: Customer) => {
    const normalizedCustomer = normalizeCustomerBalance(customer);
    setHydratedCustomers((current) => ({
      ...current,
      [normalizedCustomer.id]: normalizedCustomer,
    }));
    setSelectedCustomer((current) => (current?.id === normalizedCustomer.id ? normalizedCustomer : current));
  }, []);

  const loadSettings = () => {
    if (activeBusiness) {
      const storedSettings = localStorage.getItem(`business_settings_${activeBusiness.id}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setCreditDays(settings.credit_days || 30);
      }
    }
  };

  const filteredCustomers = customersView.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (customer.phone && customer.phone.includes(searchTerm)) ||
                          (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesFilter = true;

    if (filter === 'debt') matchesFilter = hasAccountsReceivable ? customer.balance > 0 : true;
    if (filter === 'clean') matchesFilter = customer.balance <= 0;
    
    if (filter === 'overdue') {
        matchesFilter = hasAccountsReceivable ? customer.receivable_status === 'overdue' : true;
    }
    
    if (filter === 'due_soon') {
        matchesFilter = hasAccountsReceivable
          ? customer.balance > 0 && ['due_soon', 'due_today'].includes(customer.receivable_status || '')
          : true;
    }

    return matchesSearch && matchesFilter;
  });

  const debtCustomers = customersView
    .filter((customer) => customer.balance > 0)
    .sort((a, b) => {
      const overdueGap = (b.receivable_days_overdue || 0) - (a.receivable_days_overdue || 0);
      if (overdueGap !== 0) return overdueGap;
      return (b.balance || 0) - (a.balance || 0);
    });

  const hasMobileFilters = searchTerm.trim().length > 0 || filter !== 'all';
  const mobileFilterSummary = hasMobileFilters ? 'Con filtros activos' : 'Buscar y estado';
  const mobileSummaryLabel = `${filteredCustomers.length} cliente(s)`;
  const mobileClientFilters = useMobileFilterDraft({
    value: { searchTerm, filter },
    onApply: (nextValue) => {
      setSearchTerm(nextValue.searchTerm);
      setFilter(nextValue.filter);
    },
    createEmptyValue: () => ({
      searchTerm: '',
      filter: 'all',
    }),
  });

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      await deleteCustomer(activeBusiness.id, id);
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
        if (activeTab === 'detail') setActiveTab('list');
      }
    }
  };

  const handleNewClient = () => {
    setEditingCustomer(null); 
    setIsFormOpen(true);
  };

  // Modals (Common)
  const modals = (
    <>
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => activeBusiness && fetchCustomers(activeBusiness.id)}
        editingCustomer={editingCustomer}
      />

      <CreditSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSuccess={() => {
            loadSettings();
            if (activeBusiness) fetchCustomers(activeBusiness.id);
        }}
      />
    </>
  );

  if (isDesktop) {
      return (
        <PageLayout data-tour="customers.panel">
          <PageHeader 
            title="Clientes" 
            description="Gestiona tu base de clientes y sus estados de cuenta."
            action={
                     <Button onClick={handleNewClient} data-tour="customers.primaryAction.desktop">
                         <UserPlus className="w-4 h-4" />
                         <span>Nuevo Cliente</span>
                     </Button>
            }
          />
    
          <PageBody className="p-0 lg:p-4 pb-20 lg:pb-8">
             <div className="flex flex-col h-full lg:gap-6 relative">
                 <div className="px-4 lg:px-0">
                   <PageStack>
                     <PageNotice
                       description="Gestiona la relación con cada cliente desde una sola vista y entra al detalle sólo cuando lo necesites."
                       dismissible
                     />
                     <PageSummary title="Resumen rápido" description="Mira la salud de tu base de clientes antes de buscar o abrir fichas.">
                      <div className="shrink-0" data-tour="customers.balance">
                        <ClientsKpis customers={customersView} showReceivables={hasAccountsReceivable} />
                      </div>
                    </PageSummary>
                    <PageToolbarCard className="app-toolbar" data-tour="customers.filters">
                      <ClientsToolbar 
                          search={searchTerm}
                          onSearchChange={setSearchTerm}
                          filter={filter}
                          onFilterChange={setFilter}
                           onOpenSettings={() => setIsSettingsOpen(true)}
                           showReceivables={hasAccountsReceivable}
                       />
                     </PageToolbarCard>
                   </PageStack>
                 </div>

                 <div className="flex-1 min-h-0 flex gap-4 lg:gap-6 relative px-4 lg:px-0 pb-4 lg:pb-0">
                      {/* List */}
                     <div className="flex w-full lg:w-1/3 flex-col overflow-hidden" data-tour="customers.table">
                         <ClientList 
                             customers={filteredCustomers}
                             selectedCustomer={selectedCustomer}
                             onSelectCustomer={setSelectedCustomer}
                             onEdit={(c) => { setEditingCustomer(c); setIsFormOpen(true); }}
                             onDelete={handleDelete}
                             creditDays={creditDays}
                             onCreate={handleNewClient}
                         />
                     </div>
    
                      {/* Detail */}
                      <div className="app-surface hidden w-full flex-col lg:flex lg:w-2/3 lg:h-auto" data-tour="customers.detail">
                          <ClientDetailPanel 
                              customer={selectedCustomer}
                              onEdit={() => { setEditingCustomer(selectedCustomer); setIsFormOpen(true); }}
                              onClose={() => setSelectedCustomer(null)}
                              showReceivables={hasAccountsReceivable}
                              onCustomerHydrated={handleCustomerHydrated}
                          />
                      </div>
                 </div>
             </div>
          </PageBody>
          {modals}
        </PageLayout>
      );
  }

  // Mobile Layout with SwipePager
  return (
    <PageLayout data-tour="customers.panel">
      <PageHeader
        title="Clientes"
        description="Busca clientes y abre su ficha cuando la necesites."
        mobileFab={{
          label: '+Cliente',
          icon: UserPlus,
          onClick: handleNewClient,
        }}
        action={
          <PageHeaderActionButton
            onClick={handleNewClient}
            icon={UserPlus}
            label="Nuevo cliente"
            mobileLabel="Cliente"
            data-tour="customers.primaryAction.mobile"
          />
        }
      />

      <ContentAnchor />

      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
            {
                id: 'list',
                title: 'Lista',
                icon: Users,
                content: (
                  <PageStack>
                    <MobileUtilityBar>
                      <MobileFilterDrawer summary={mobileFilterSummary} {...mobileClientFilters.sheetProps}>
                        <MobileFilterSection title="Filtrar clientes" description="Busca primero y luego ajusta el estado principal.">
                          <div data-tour="customers.filters">
                          <ClientsToolbar
                            search={mobileClientFilters.draft.searchTerm}
                            onSearchChange={(value) => mobileClientFilters.setDraft((current) => ({ ...current, searchTerm: value }))}
                            filter={mobileClientFilters.draft.filter}
                            onFilterChange={(value) => mobileClientFilters.setDraft((current) => ({ ...current, filter: value }))}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            showReceivables={hasAccountsReceivable}
                          />
                          </div>
                        </MobileFilterSection>
                      </MobileFilterDrawer>
                      <MobileSummaryDrawer summary={mobileSummaryLabel}>
                        <div data-tour="customers.balance">
                          <ClientsKpis customers={customersView} showReceivables={hasAccountsReceivable} />
                        </div>
                      </MobileSummaryDrawer>
                      <MobileHelpDisclosure summary="Como usar clientes">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Empieza por la lista, usa Filtros para encontrar rapido a quien necesitas y abre el detalle solo cuando haga falta revisar historial, saldo o contacto.
                        </p>
                      </MobileHelpDisclosure>
                    </MobileUtilityBar>
                    <PageNotice className="hidden"
                      description="Empieza por la lista y abre el detalle sólo cuando necesites revisar historial, saldo o contacto."
                      dismissible
                    />
                    <PageSummary className="hidden" title="Resumen rápido" description="Una lectura corta antes de filtrar o abrir la ficha del cliente.">
                      <div data-tour="customers.balance">
                        <ClientsKpis customers={customersView} showReceivables={hasAccountsReceivable} />
                      </div>
                    </PageSummary>
                    <div data-tour="customers.table">
                      <PageToolbarCard className="app-toolbar hidden">
                        <ClientsToolbar 
                            search={searchTerm}
                            onSearchChange={setSearchTerm}
                            filter={filter}
                            onFilterChange={setFilter}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            showReceivables={hasAccountsReceivable}
                        />
                      </PageToolbarCard>
                      
                      <div className="flex-1 min-h-0">
                          <ClientList 
                              customers={filteredCustomers}
                              selectedCustomer={selectedCustomer}
                              onSelectCustomer={(c) => {
                                  setSelectedCustomer(c);
                                  setActiveTab('detail');
                              }}
                              onEdit={(c) => { setEditingCustomer(c); setIsFormOpen(true); }}
                              onDelete={handleDelete}
                              creditDays={creditDays}
                              onCreate={handleNewClient}
                          />
                      </div>
                    </div>
                  </PageStack>
                )
            },
            {
                id: 'detail',
                title: 'Detalle',
                icon: User,
                content: (
                  <div className="flex min-h-0 flex-1 flex-col" data-tour="customers.detail">
                      {selectedCustomer ? (
                          <ClientDetailPanel 
                              customer={selectedCustomer}
                              onEdit={() => { setEditingCustomer(selectedCustomer); setIsFormOpen(true); }}
                              onClose={() => {
                                  setSelectedCustomer(null);
                                  setActiveTab('list');
                              }}
                              showReceivables={hasAccountsReceivable}
                              onCustomerHydrated={handleCustomerHydrated}
                          />
                      ) : (
                          <div className="app-empty-state flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                              <p>Selecciona un cliente de la lista para ver sus detalles.</p>
                              <Button variant="outline" className="mt-4" onClick={() => setActiveTab('list')}>
                                  Ir a la Lista
                              </Button>
                          </div>
                      )}
                  </div>
                )
            },
            ...(hasAccountsReceivable ? [{
                id: 'debts',
                title: 'Deudas',
                icon: AlertCircle,
                content: (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="app-stat-card">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Clientes con saldo</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">{debtCustomers.length}</p>
                          </div>
                          <div className="app-stat-card border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10">
                              <p className="text-xs text-red-600 dark:text-red-300 uppercase tracking-wide mb-1">Vencidos</p>
                              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                  {debtCustomers.filter((customer) => customer.receivable_status === 'overdue').length}
                              </p>
                          </div>
                          <div className="app-stat-card border-yellow-200 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-900/10">
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 uppercase tracking-wide mb-1">Por vencer / hoy</p>
                              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                                  {debtCustomers.filter((customer) => ['due_soon', 'due_today'].includes(customer.receivable_status || '')).length}
                              </p>
                          </div>
                      </div>

                        <div className="app-surface overflow-hidden">
                            <div className="app-divider flex items-center justify-between border-b px-4 py-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Seguimiento de cartera</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Resumen rápido por cliente desde la fuente real de cuentas por cobrar.</p>
                                </div>
                                <Button size="sm" onClick={() => navigate('/payments')}>
                                    Ir a Cartera y Pagos
                                </Button>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {debtCustomers.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay cuentas por cobrar en este momento.
                                    </div>
                                ) : (
                                    debtCustomers.slice(0, 12).map((customer) => (
                                        <button
                                            key={customer.id}
                                            type="button"
                                            className="w-full px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/55"
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setActiveTab('detail');
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                                                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                        {customer.receivable_due_date
                                                            ? `Vence ${new Date(customer.receivable_due_date).toLocaleDateString()}`
                                                            : 'Sin vencimiento'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-gray-900 dark:text-white">${customer.balance.toLocaleString()}</div>
                                                    <div className="text-xs mt-1">
                                                        <span className={`inline-flex px-2 py-1 rounded-full ${
                                                            customer.receivable_status === 'overdue'
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                                : customer.receivable_status === 'due_today'
                                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                                    : customer.receivable_status === 'due_soon'
                                                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                        }`}>
                                                            {customer.receivable_status_label || 'Pendiente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }] : []),
            {
                id: 'top',
                title: 'Top',
                icon: Trophy,
                content: (
                    <div className="space-y-6">
                        <TopCustomersCard 
                            customers={customersView} 
                            sales={sales}
                            onSelectCustomer={(c) => {
                                setSelectedCustomer(c);
                                setActiveTab('detail');
                            }}
                        />
                    </div>
                )
            }
        ]}
      />
      {modals}
    </PageLayout>
  );
};
