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
    
    // Logic for overdue/due soon based on mock data if real data is missing
    // We assume 'days_since_oldest' is available or we mock it for now based on customer id for demo purposes if 0
    // In real app, days_since_oldest comes from backend
    const daysOverdue = customer.days_since_oldest || (customer.balance > 0 ? (customer.id % 40) : 0); // Mock for demo if missing
    
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
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4" data-tour="customers.panel">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_CUSTOMERS}
      />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Gestiona tu base de clientes y sus estados de cuenta.</p>
        </div>
      </div>

      <div data-tour="customers.balance">
        <ClientsKpis customers={customers} />
      </div>

      <div className="flex-1 min-h-0 flex gap-4 lg:gap-6 relative">
          {/* Left Panel: List */}
          <div className={`${selectedCustomer ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden`} data-tour="customers.table">
              <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 shrink-0" data-tour="customers.filters">
                  <ClientsToolbar 
                      search={searchTerm}
                      onSearchChange={setSearchTerm}
                      filter={filter}
                      onFilterChange={setFilter}
                      onExport={handleExport}
                      onNewClient={handleNewClient}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                  />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                  <ClientList 
                      customers={filteredCustomers}
                      selectedCustomer={selectedCustomer}
                      onSelectCustomer={setSelectedCustomer}
                      onEdit={(c) => { setEditingCustomer(c); setIsFormOpen(true); }}
                      onDelete={handleDelete}
                      creditDays={creditDays}
                  />
              </div>
          </div>

          {/* Right Panel: Detail */}
          <div className={`${selectedCustomer ? 'flex absolute inset-0 z-10 lg:static' : 'hidden lg:flex'} w-full lg:w-2/3 flex-col lg:h-auto bg-white dark:bg-gray-800 lg:rounded-xl lg:border lg:border-gray-200 lg:dark:border-gray-700 lg:shadow-sm`} data-tour="customers.detail">
              <ClientDetailPanel 
                  customer={selectedCustomer}
                  onEdit={() => { setEditingCustomer(selectedCustomer); setIsFormOpen(true); }}
                  onClose={() => setSelectedCustomer(null)}
              />
          </div>
      </div>

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
    </div>
  );
};
