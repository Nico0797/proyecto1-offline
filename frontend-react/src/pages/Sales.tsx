import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useSaleStore } from '../store/saleStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { CreateSaleModal } from '../components/Sales/CreateSaleModal';
import { SaleDetailsModal } from '../components/Sales/SaleDetailsModal';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import { SalesKpis } from '../components/Sales/SalesKpis';
import { SalesToolbar } from '../components/Sales/SalesToolbar';
import { SalesTable } from '../components/Sales/SalesTable';
import { ReceivablesTab } from '../components/Sales/ReceivablesTab';
import { Sale } from '../types';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { FEATURES, FREE_LIMITS } from '../auth/plan';
import { SwipePager } from '../components/ui/SwipePager';

export const Sales = () => {
  const { activeBusiness } = useBusinessStore();
  const { sales, loading, fetchSales, deleteSale } = useSaleStore();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<string>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('sales'));
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      fetchSales(activeBusiness.id);
    }
  }, [activeBusiness]);

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
      try {
        await deleteSale(activeBusiness.id, id);
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Error al eliminar la venta');
      }
    }
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = (sale.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.id.toString().includes(searchTerm) ||
                          (sale.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = sale.paid;
    if (statusFilter === 'pending') matchesStatus = !sale.paid;
    if (statusFilter === 'cancelled') matchesStatus = sale.status === 'cancelled';

    let matchesDate = true;
    if (dateRange.start) {
      const start = new Date(dateRange.start);
      matchesDate = matchesDate && new Date(sale.sale_date) >= start;
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23,59,59,999);
      matchesDate = matchesDate && new Date(sale.sale_date) <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleNewSale = () => {
    if (user?.plan === 'free' && sales.length >= FREE_LIMITS.SALES) {
      setShowUpgradeModal(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" data-tour="sales.panel">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_SALES}
      />
      
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 pt-safe">
          <div className="flex flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ventas</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona tus transacciones y cuentas por cobrar.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={handleNewSale} className="hidden sm:flex">
                    Venta Rápida
                </Button>
                <Button onClick={handleNewSale} data-tour="sales.primaryAction.desktop">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Nueva Venta</span>
                    <span className="sm:hidden">Nueva</span>
                </Button>
            </div>
        </div>
      </div>

      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
            {
                id: 'list',
                title: 'Listado de Ventas',
                content: (
                    <div className="space-y-6">
                        <div data-tour="sales.table">
                             <SalesKpis sales={sales} />
                             <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                                <SalesToolbar 
                                    search={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    statusFilter={statusFilter}
                                    onStatusFilterChange={setStatusFilter}
                                    dateRange={dateRange}
                                    onDateRangeChange={setDateRange}
                                />
                             </div>
                             
                            <SalesTable 
                                sales={filteredSales}
                                loading={loading}
                                onView={setSelectedSale}
                                onDelete={handleDelete}
                            />
                        </div>
                    </div>
                )
            },
            {
                id: 'receivables',
                title: 'Fiados (Cuentas por Cobrar)',
                content: (
                    <ReceivablesTab 
                        sales={sales}
                        onView={(sale) => setSelectedSale(sale)}
                    />
                )
            }
        ]}
      />

      <CreateSaleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => activeBusiness && fetchSales(activeBusiness.id)}
      />

      <SaleDetailsModal 
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  );
};
