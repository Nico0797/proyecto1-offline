import React from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { useSaleStore } from '../../store/saleStore';
import { Customer } from '../../types';
import { CustomerList } from '../Customers/CustomerList';
import { CustomerDetailPanel } from '../Customers/CustomerDetailPanel';
import { CreateCustomerModal } from '../Customers/CreateCustomerModal';
import { TopCustomersCard } from '../Customers/TopCustomersCard';
import { OverdueDebtsCard } from '../Customers/OverdueDebtsCard';
import { Users, AlertTriangle, Wallet } from 'lucide-react';

export const DashboardCustomersTab = () => {
  const { activeBusiness } = useBusinessStore();
  const { customers } = useCustomerStore();
  const { sales, fetchSales } = useSaleStore();
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt' | 'paid'>('all');
  const [sort, setSort] = useState<'name' | 'debt' | 'recent'>('name');

  useEffect(() => {
    // Always fetch customers, regardless of activeBusiness
    const bid = activeBusiness?.id || 0;
    fetchCustomers(bid);
    fetchSales(bid);
  }, [activeBusiness, fetchCustomers, fetchSales]);

  if (!customers) {
      return <div>Cargando datos...</div>;
  }

  // KPIs Calculation
  const totalCustomers = customers.length;
  const customersWithDebt = customers.filter(c => c.balance > 0);
  const totalDebt = customersWithDebt.reduce((acc, c) => acc + c.balance, 0);
  // topDebtors removed from here as we have a new dedicated card

  const handleSelectCustomer = (customer: Customer) => {
      setSelectedCustomer(customer);
  };

  const handleRefresh = () => {
      fetchCustomers(activeBusiness?.id || 0);
      fetchSales(activeBusiness?.id || 0);
      if (selectedCustomer) {
          const updated = customers.find(c => c.id === selectedCustomer.id);
          if (updated) setSelectedCustomer(updated);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* KPIs Header */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Clientes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white ml-1">{totalCustomers}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Con Deuda</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white ml-1">{customersWithDebt.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
                    <Wallet className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Por Cobrar</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white ml-1">${totalDebt.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Customers Card */}
          <div className="lg:col-span-1">
              <TopCustomersCard 
                  customers={customers} 
                  sales={sales} 
                  onSelectCustomer={handleSelectCustomer} 
              />
          </div>
          
          {/* Overdue Debts Card */}
          <div className="lg:col-span-2">
              <OverdueDebtsCard 
                  customers={customers} 
                  sales={sales} 
                  onSelectCustomer={handleSelectCustomer} 
                  businessName={activeBusiness?.name || 'Mi Negocio'}
              />
          </div>
      </div>

      {/* Main Content Area (Split View) */}
      <div className="flex-1 flex overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm min-h-[500px]">
        {/* Left List */}
        <div className={`${selectedCustomer ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 flex-col border-r border-gray-200 dark:border-gray-700`}>
            <CustomerList 
                customers={customers}
                selectedId={selectedCustomer?.id}
                onSelect={handleSelectCustomer}
                onAdd={() => setIsCreateModalOpen(true)}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filter={filter}
                onFilterChange={setFilter}
                sort={sort}
                onSortChange={setSort}
            />
        </div>

        {/* Right Detail Panel */}
        <div className={`${!selectedCustomer ? 'hidden lg:flex' : 'flex'} w-full lg:w-2/3 bg-gray-50 dark:bg-gray-900`}>
            <CustomerDetailPanel 
                customer={selectedCustomer} 
                onClose={() => {
                    setSelectedCustomer(null);
                }} 
            />
        </div>
      </div>

      <CreateCustomerModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={handleRefresh}
      />
    </div>
  );
};
