import { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Wallet } from 'lucide-react';
import {
  ContentSection,
  PageHeader,
  PageLayout,
  PageNotice,
  PageStack,
  SectionStack,
  SummarySection,
  ToolbarSection,
} from '../components/Layout/PageLayout';
import { CreateSaleModal } from '../components/Sales/CreateSaleModal';
import { ReceivablesTab } from '../components/Sales/ReceivablesTab';
import { SaleDetailsModal } from '../components/Sales/SaleDetailsModal';
import { SalesKpis } from '../components/Sales/SalesKpis';
import { SalesTable } from '../components/Sales/SalesTable';
import { SalesToolbar } from '../components/Sales/SalesToolbar';
import { Button } from '../components/ui/Button';
import { SwipePager } from '../components/ui/SwipePager';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import { useBusinessStore } from '../store/businessStore';
import { useSaleStore } from '../store/saleStore';
import { Sale } from '../types';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';

export const Sales = () => {
  const { activeBusiness } = useBusinessStore();
  const { sales, loading, fetchSales, deleteSale } = useSaleStore();
  const [activeTab, setActiveTab] = useState<string>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('sales'));

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (activeBusiness) {
      fetchSales(activeBusiness.id, { includeItems: false });
    }
  }, [activeBusiness, fetchSales]);

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('Estas seguro de que quieres eliminar esta venta? Esta accion no se puede deshacer.')) {
      try {
        await deleteSale(activeBusiness.id, id);
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Error al eliminar la venta');
      }
    }
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      (sale.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(sale.sale_date) <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleNewSale = () => {
    setIsCreateModalOpen(true);
  };

  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';
  const mobileFilterSummary = hasActiveFilters ? 'Con filtros activos' : 'Buscar y filtrar';
  const mobileSummaryLabel = `${filteredSales.length} venta(s)`;
  const mobileFilters = useMobileFilterDraft({
    value: { searchTerm, statusFilter, dateRange },
    onApply: (nextValue) => {
      setSearchTerm(nextValue.searchTerm);
      setStatusFilter(nextValue.statusFilter);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      searchTerm: '',
      statusFilter: 'all',
      dateRange: getPeriodPreference('sales'),
    }),
  });

  return (
    <PageLayout data-tour="sales.panel">
      <PageHeader
        title="Ventas"
        description="Registra lo que ya vendiste, revisa el estado de pago y sigue los saldos pendientes sin perder contexto."
        action={
          <div className="w-full sm:w-auto" data-tour="sales.primaryAction.mobile">
            <Button onClick={handleNewSale} className="w-full sm:w-auto" data-tour="sales.primaryAction.desktop">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Registrar venta</span>
              <span className="sm:hidden">Vender</span>
            </Button>
          </div>
        }
      />

      <SwipePager
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
          {
            id: 'list',
            title: 'Ventas registradas',
            mobileTitle: 'Ventas',
            icon: ShoppingCart,
            content: (
              <SectionStack>
                <div className="hidden lg:block">
                  <PageStack>
                    <PageNotice
                      description="Primero registra la venta. Despues, si quedo un saldo pendiente, lo podras seguir desde aqui y desde Cobros."
                      dismissible
                    />
                    <SummarySection title="Resumen rapido" description="Mira el ritmo del dia antes de entrar al detalle.">
                      <div data-tour="sales.kpis">
                        <SalesKpis sales={sales} />
                      </div>
                    </SummarySection>
                    <ToolbarSection data-tour="sales.filters">
                      <SalesToolbar
                        search={searchTerm}
                        onSearchChange={setSearchTerm}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                      />
                    </ToolbarSection>
                  </PageStack>
                </div>

                <ContentSection>
                  <MobileUnifiedPageShell
                    utilityBar={(
                      <MobileUtilityBar>
                        <MobileFilterDrawer summary={mobileFilterSummary} {...mobileFilters.sheetProps}>
                          <SalesToolbar
                            search={mobileFilters.draft.searchTerm}
                            onSearchChange={(value) => mobileFilters.setDraft((current) => ({ ...current, searchTerm: value }))}
                            statusFilter={mobileFilters.draft.statusFilter}
                            onStatusFilterChange={(value) => mobileFilters.setDraft((current) => ({ ...current, statusFilter: value }))}
                            dateRange={mobileFilters.draft.dateRange}
                            onDateRangeChange={(value) => mobileFilters.setDraft((current) => ({ ...current, dateRange: value }))}
                          />
                        </MobileFilterDrawer>
                        <MobileSummaryDrawer summary={mobileSummaryLabel}>
                          <div data-tour="sales.kpis">
                            <SalesKpis sales={sales} />
                          </div>
                        </MobileSummaryDrawer>
                        <MobileHelpDisclosure summary="Como usar ventas">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Primero registra la venta. Si quedo un saldo pendiente, lo podras seguir desde aqui y desde Cobros.
                          </p>
                        </MobileHelpDisclosure>
                      </MobileUtilityBar>
                    )}
                  >
                    <div data-tour="sales.table">
                      <SalesTable
                        sales={filteredSales}
                        loading={loading}
                        onView={setSelectedSale}
                        onDelete={handleDelete}
                        onCreate={handleNewSale}
                      />
                    </div>
                  </MobileUnifiedPageShell>
                </ContentSection>
              </SectionStack>
            ),
          },
          {
            id: 'receivables',
            title: 'Pendientes de cobro',
            mobileTitle: 'Por cobrar',
            icon: Wallet,
            content: <ReceivablesTab sales={sales} onView={(sale) => setSelectedSale(sale)} />,
          },
        ]}
      />

      <CreateSaleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => activeBusiness && fetchSales(activeBusiness.id, { includeItems: false })}
      />

      <SaleDetailsModal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} sale={selectedSale} />
    </PageLayout>
  );
};
