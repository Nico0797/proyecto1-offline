import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { useSaleStore } from '../../store/saleStore';
import { Customer } from '../../types';
import { CustomerList } from '../Customers/CustomerList';
import { CustomerDetailPanel } from '../Customers/CustomerDetailPanel';
import { CreateCustomerModal } from '../Customers/CreateCustomerModal';
import { TopCustomersCard } from '../Customers/TopCustomersCard';
import { Users, AlertTriangle, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';

export const DashboardCustomersTab = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
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
  const priorityReceivables = customersWithDebt
    .sort((a, b) => {
      const overdueGap = (b.receivable_days_overdue || 0) - (a.receivable_days_overdue || 0);
      if (overdueGap !== 0) return overdueGap;
      return (b.balance || 0) - (a.balance || 0);
    })
    .slice(0, 6);
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
        <div className="app-surface rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Clientes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white ml-1">{totalCustomers}</p>
        </div>

        <div className="app-surface rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Con Deuda</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white ml-1">{customersWithDebt.length}</p>
        </div>

        <div className="app-surface rounded-xl p-4 shadow-sm">
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
          
          {/* Receivables Summary */}
          <div className="lg:col-span-2">
              <div className="app-surface h-full rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              Seguimiento de cartera
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                              Clientes priorizados según estado real de cuentas por cobrar.
                          </p>
                      </div>
                      <Button size="sm" onClick={() => navigate('/payments')}>
                          Ir a Cartera y Pagos
                      </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="app-muted-panel rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Con saldo</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{customersWithDebt.length}</p>
                      </div>
                      <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-3">
                          <p className="text-xs text-red-600 dark:text-red-300 uppercase tracking-wide mb-1">Vencidos</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">
                              {customersWithDebt.filter((customer) => customer.receivable_status === 'overdue').length}
                          </p>
                      </div>
                      <div className="rounded-lg border border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 p-3">
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 uppercase tracking-wide mb-1">Por vencer / hoy</p>
                          <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                              {customersWithDebt.filter((customer) => ['due_soon', 'due_today'].includes(customer.receivable_status || '')).length}
                          </p>
                      </div>
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto">
                      {priorityReceivables.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                                  <Wallet className="w-6 h-6 text-green-500" />
                              </div>
                              <p className="text-sm">No hay cuentas por cobrar en este momento.</p>
                          </div>
                      ) : (
                          priorityReceivables.map((customer) => (
                              <button
                                  key={customer.id}
                                  type="button"
                                  className="app-surface w-full rounded-xl p-4 text-left transition-all hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                  onClick={() => handleSelectCustomer(customer)}
                              >
                                  <div className="flex items-start justify-between gap-3">
                                      <div>
                                          <h4 className="font-bold text-gray-900 dark:text-white">{customer.name}</h4>
                                          <div className="text-xs text-gray-500 mt-1">
                                              {customer.receivable_due_date
                                                  ? `Vence ${new Date(customer.receivable_due_date).toLocaleDateString()}`
                                                  : 'Sin vencimiento'}
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className="font-bold text-gray-900 dark:text-white">${customer.balance.toLocaleString()}</div>
                                          <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-[10px] font-bold ${
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
                              </button>
                          ))
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Main Content Area (Split View) */}
      <div className="app-surface flex min-h-[500px] flex-1 overflow-hidden rounded-xl shadow-sm">
        {/* Left List */}
        <div className={`${selectedCustomer ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 flex-col border-r border-gray-200 dark:border-gray-800`}>
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
        <div className={`${!selectedCustomer ? 'hidden lg:flex' : 'flex'} app-canvas w-full lg:w-2/3`}>
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
