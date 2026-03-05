import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useCustomerStore } from '../store/customerStore';
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
import { PageLayout, PageHeader, PageFilters, PageBody } from '../components/Layout/PageLayout';
import { Button } from '../components/ui/Button';
import { UserPlus } from 'lucide-react';

export const Customers = () => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers, deleteCustomer } = useCustomerStore();
  const { user } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // State for credit settings
  const [creditDays, setCreditDays] = useState(30);

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
      }
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Nombre', 'Teléfono', 'Email', 'Dirección', 'Deuda Actual'];
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(c => [
        c.id,
        `"${c.name}"`,
        c.phone || '',
        c.email || '',
        `"${c.address || ''}"`,
        c.balance
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

  return (
    <PageLayout>
      <PageHeader 
        title="Clientes" 
        description="Gestiona tu base de clientes y sus estados de cuenta."
        action={
             <Button onClick={handleNewClient} data-tour="customers.primaryAction">
                 <UserPlus className="w-4 h-4 mr-2" /> 
                 <span className="hidden sm:inline">Nuevo Cliente</span>
                 <span className="sm:inline hidden">Nuevo</span>
                 <span className="inline sm:hidden"><UserPlus className="w-4 h-4" /></span>
             </Button>
        }
      />

      <PageFilters>
          <ClientsToolbar 
              search={searchTerm}
              onSearchChange={setSearchTerm}
              filter={filter}
              onFilterChange={setFilter}
              onExport={handleExport}
              onOpenSettings={() => setIsSettingsOpen(true)}
          />
      </PageFilters>

      <PageBody className="p-0 lg:p-4 pb-20 lg:pb-8">
         <div className="flex flex-col h-full lg:gap-6 relative">
             <div className="p-4 lg:p-0 shrink-0" data-tour="customers.balance">
                 <ClientsKpis customers={customers} />
             </div>

             <div className="flex-1 min-h-0 flex gap-4 lg:gap-6 relative px-4 lg:px-0 pb-4 lg:pb-0">
                  {/* List */}
                  <div className={`${selectedCustomer ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden`} data-tour="customers.table">
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
                  <div className={`${selectedCustomer ? 'flex fixed inset-0 z-50 lg:static lg:z-auto' : 'hidden lg:flex'} w-full lg:w-2/3 flex-col lg:h-auto bg-white dark:bg-gray-800 lg:rounded-xl lg:border lg:border-gray-200 lg:dark:border-gray-700 lg:shadow-sm`} data-tour="customers.detail">
                      <ClientDetailPanel 
                          customer={selectedCustomer}
                          onEdit={() => { setEditingCustomer(selectedCustomer); setIsFormOpen(true); }}
                          onClose={() => setSelectedCustomer(null)}
                      />
                  </div>
             </div>
         </div>
      </PageBody>

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
    </PageLayout>
  );
};
