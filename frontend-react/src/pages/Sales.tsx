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
import { DataTableContainer } from '../components/ui/DataTableContainer';
import { FEATURES, FREE_LIMITS } from '../auth/plan';

export const Sales = () => {
  const { activeBusiness } = useBusinessStore();
  const { sales, loading, fetchSales, deleteSale } = useSaleStore();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'list' | 'receivables'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Initialize with persisted preference or default (7 days)
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

  const handleExport = () => {
    // Implement CSV export logic
    const headers = ['ID', 'Fecha', 'Cliente', 'Estado', 'Total', 'Saldo', 'Método', 'Nota'];
    const csvContent = [
      headers.join(','),
      ...filteredSales.map(s => [
        s.id,
        new Date(s.sale_date).toISOString().split('T')[0],
        `"${s.customer_name || 'Cliente Casual'}"`,
        s.paid ? 'Pagada' : 'Pendiente',
        s.total,
        s.balance || 0,
        s.payment_method,
        `"${s.note || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ventas_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        matchesDate = matchesDate && new Date(sale.sale_date) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
        matchesDate = matchesDate && new Date(sale.sale_date) <= new Date(dateRange.end);
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
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]" data-tour="sales.root">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_SALES}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0" data-tour="sales.panel">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ventas</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Gestiona tus transacciones y cuentas por cobrar.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={handleNewSale}>
                Venta Rápida
            </Button>
            <Button onClick={handleNewSale} data-tour="sales.primaryAction">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Venta
            </Button>
        </div>
      </div>

      <div data-tour="sales.kpis" className="flex-shrink-0">
        <SalesKpis sales={sales} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex gap-6 overflow-x-auto">
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'list' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('list')}
          >
            Listado de Ventas
          </button>
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'receivables' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('receivables')}
            data-tour="sales.hold"
          >
            Cuentas por Cobrar (Fiados)
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
          <>
            <div data-tour="sales.filters" className="flex-shrink-0">
            <SalesToolbar 
                search={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onExport={handleExport}
            />
            </div>
            <div data-tour="sales.table" className="flex-grow min-h-0">
            <DataTableContainer>
              <SalesTable 
                  sales={filteredSales}
                  loading={loading}
                  onView={setSelectedSale}
                  onDelete={handleDelete}
              />
            </DataTableContainer>
            </div>
          </>
      )}

      {activeTab === 'receivables' && (
          <ReceivablesTab 
             sales={sales}
             onView={(sale) => {
                 setSelectedSale(sale);
                 // In future: Open modal in "Add Payment" mode directly
             }}
          />
      )}

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
