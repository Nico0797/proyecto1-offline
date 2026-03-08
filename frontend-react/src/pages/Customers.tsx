import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useCustomerStore } from '../store/customerStore';
import { useSaleStore } from '../store/saleStore';
import { useAuthStore } from '../store/authStore';
import { ClientsKpis } from '../components/Customers/ClientsKpis';
import { ClientsToolbar } from '../components/Customers/ClientsToolbar';
import { ClientList } from '../components/Customers/ClientList';
import { ClientDetailPanel } from '../components/Customers/ClientDetailPanel';
import { ClientFormModal } from '../components/Customers/ClientFormModal';
import { CreditSettingsModal } from '../components/Customers/CreditSettingsModal';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import { Customer } from '../types';
import { FEATURES, FREE_LIMITS } from '../auth/plan';
import { Button } from '../components/ui/Button';
import { UserPlus } from 'lucide-react';
import { SwipePager } from '../components/ui/SwipePager';
import { TopCustomersCard } from '../components/Customers/TopCustomersCard';
import { OverdueDebtsCard } from '../components/Customers/OverdueDebtsCard';
import { PageLayout, PageHeader, PageBody } from '../components/Layout/PageLayout';

export const Customers = () => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers, deleteCustomer } = useCustomerStore();
  const { sales } = useSaleStore();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<string>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // State for credit settings
  const [creditDays, setCreditDays] = useState(30);

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

  const loadSettings = () => {
    if (activeBusiness) {
      const storedSettings = localStorage.getItem(`business_settings_${activeBusiness.id}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setCreditDays(settings.credit_days || 30);
      }
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (customer.phone && customer.phone.includes(searchTerm)) ||
                          (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesFilter = true;
    
    const daysOverdue = customer.days_since_oldest || (customer.balance > 0 ? (customer.id % 40) : 0);
    
    if (filter === 'debt') matchesFilter = customer.balance > 0;
    if (filter === 'clean') matchesFilter = customer.balance <= 0;
    
    if (filter === 'overdue') {
        matchesFilter = customer.balance > 0 && daysOverdue > creditDays;
    }
    
    if (filter === 'due_soon') {
        matchesFilter = customer.balance > 0 && daysOverdue <= creditDays && daysOverdue > (creditDays - 5);
    }

    return matchesSearch && matchesFilter;
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
    if (user?.plan === 'free' && customers.length >= FREE_LIMITS.CUSTOMERS) {
      setShowUpgradeModal(true);
      return;
    }
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
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_CUSTOMERS}
      />
    </>
  );

  if (isDesktop) {
      return (
        <PageLayout>
          <PageHeader 
            title="Clientes" 
            description="Gestiona tu base de clientes y sus estados de cuenta."
            action={
                 <Button onClick={handleNewClient} data-tour="customers.primaryAction.desktop">
                     <UserPlus className="w-4 h-4 mr-2" /> 
                     <span>Nuevo Cliente</span>
                 </Button>
            }
          />
    
          <PageBody className="p-0 lg:p-4 pb-20 lg:pb-8">
             <div className="flex flex-col h-full lg:gap-6 relative">
                 <div className="p-4 lg:p-0 shrink-0" data-tour="customers.balance">
                     <ClientsKpis customers={customers} />
                 </div>
                 
                 <div className="px-4 lg:px-0">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                      <ClientsToolbar 
                          search={searchTerm}
                          onSearchChange={setSearchTerm}
                          filter={filter}
                          onFilterChange={setFilter}
                          onOpenSettings={() => setIsSettingsOpen(true)}
                      />
                    </div>
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
                         />
                     </div>
    
                      {/* Detail */}
                      <div className="hidden lg:flex w-full lg:w-2/3 flex-col lg:h-auto bg-white dark:bg-gray-800 lg:rounded-xl lg:border lg:border-gray-200 lg:dark:border-gray-700 lg:shadow-sm" data-tour="customers.detail">
                          <ClientDetailPanel 
                              customer={selectedCustomer}
                              onEdit={() => { setEditingCustomer(selectedCustomer); setIsFormOpen(true); }}
                              onClose={() => setSelectedCustomer(null)}
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
    <div className="h-full flex flex-col overflow-hidden" data-tour="customers.panel">
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 pt-safe">
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona tu base de clientes.</p>
             </div>
             <Button onClick={handleNewClient} data-tour="customers.primaryAction.mobile">
                 <UserPlus className="w-4 h-4" />
             </Button>
        </div>
      </div>

      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
            {
                id: 'list',
                title: 'Lista',
                content: (
                    <div className="space-y-6">
                         <div data-tour="customers.balance">
                             <ClientsKpis customers={customers} />
                         </div>
                         <div data-tour="customers.table">
                             <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                                <ClientsToolbar 
                                    search={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    filter={filter}
                                    onFilterChange={setFilter}
                                    onOpenSettings={() => setIsSettingsOpen(true)}
                                />
                             </div>
                             
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
                                  />
                              </div>
                         </div>
                    </div>
                )
            },
            {
                id: 'detail',
                title: 'Detalle',
                content: (
                     <div className="h-full" data-tour="customers.detail">
                        {selectedCustomer ? (
                            <ClientDetailPanel 
                                customer={selectedCustomer}
                                onEdit={() => { setEditingCustomer(selectedCustomer); setIsFormOpen(true); }}
                                onClose={() => {
                                    setSelectedCustomer(null);
                                    setActiveTab('list');
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p>Selecciona un cliente de la lista para ver sus detalles.</p>
                                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('list')}>
                                    Ir a la Lista
                                </Button>
                            </div>
                        )}
                     </div>
                )
            },
            {
                id: 'debts',
                title: 'Deudas',
                content: (
                    <div className="space-y-6">
                        <OverdueDebtsCard 
                            customers={customers} 
                            onSelectCustomer={(c) => {
                                setSelectedCustomer(c);
                                setActiveTab('detail');
                            }}
                            businessName={activeBusiness?.name || ''}
                            sales={sales}
                        />
                    </div>
                )
            },
            {
                id: 'top',
                title: 'Top',
                content: (
                    <div className="space-y-6">
                        <TopCustomersCard 
                            customers={customers} 
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
    </div>
  );
};
