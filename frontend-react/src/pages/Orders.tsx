import { useEffect, useMemo, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import { useOrderStore, Order } from '../store/orderStore';
import { useSaleStore } from '../store/saleStore';
import { isPureOfflineRuntime } from '../services/offlineLocalData';
import { Button } from '../components/ui/Button';
import { Plus, Settings, Kanban, Table as TableIcon } from 'lucide-react';
import { CreateOrderModal } from '../components/Orders/CreateOrderModal';
import { OrderSettingsModal } from '../components/Orders/OrderSettingsModal';
import { OrdersToolbar } from '../components/Orders/OrdersToolbar';
import { OrdersTable } from '../components/Orders/OrdersTable';
import { OrdersKanban } from '../components/Orders/OrdersKanban';
import { OrderDetailDrawer } from '../components/Orders/OrderDetailDrawer';
import { CompleteOrderModal } from '../components/Orders/CompleteOrderModal';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { SwipePager } from '../components/ui/SwipePager';
import { useBreakpoint } from '../tour/useBreakpoint';
import { CompactActionGroup, ContentAnchor, ContentSection, PageHeader, PageHeaderActionButton, PageLayout, PageNotice, PageStack, SectionStack, ToolbarSection } from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';

type KanbanStatusPageId = 'pending' | 'completed' | 'cancelled';

export const Orders = () => {
  const { activeBusiness } = useBusinessStore();
  const { orders, loading, fetchOrders, updateOrderStatus, deleteOrder } = useOrderStore();
  const { fetchSales } = useSaleStore();
  const { isAuthenticated } = useAuthStore();
  const { isMobile } = useBreakpoint();

  const [activeTab, setActiveTab] = useState<'kanban' | 'table'>('kanban');
  const [activeKanbanPage, setActiveKanbanPage] = useState<KanbanStatusPageId>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('orders'));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);

  const counts = {
    all: orders.length,
    pending: orders.filter((order) => order.status === 'pending').length,
    completed: orders.filter((order) => order.status === 'completed').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  };

  useEffect(() => {
    if (activeBusiness && (isAuthenticated || isPureOfflineRuntime())) {
      fetchOrders(activeBusiness.id, {
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
      });
    }
  }, [activeBusiness, dateRange.end, dateRange.start, fetchOrders, isAuthenticated]);

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('Estas seguro de que quieres eliminar este pedido?')) {
      try {
        await deleteOrder(activeBusiness.id, id);
      } catch (error) {
        console.error('Error deleting order:', error);
      }
    }
  };

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    if (!activeBusiness) return;

    if (newStatus === 'completed') {
      setCompletingOrder(order);
      return;
    }

    try {
      await updateOrderStatus(activeBusiness.id, order.id, newStatus);
      if (newStatus === 'cancelled') {
        setActiveKanbanPage('cancelled');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleCompleteOrder = async (data: { date: string; paymentType: string; paidAmount: number; paymentMethod: string }) => {
    if (!activeBusiness || !completingOrder) return;
    try {
      const payment_details = {
        method: data.paymentMethod,
        paid_amount: data.paidAmount,
      };
      await updateOrderStatus(activeBusiness.id, completingOrder.id, 'completed', data.date, { payment_details });
      await fetchSales(activeBusiness.id, { includeItems: false });
      setActiveKanbanPage('completed');
      setCompletingOrder(null);
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const parseLocal = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      || order.id.toString().includes(searchTerm);

    let matchesStatus = true;
    if (statusFilter !== 'all') matchesStatus = order.status === statusFilter;

    let matchesDate = true;
    if (dateRange.start) {
      const orderDate = parseLocal(order.order_date.split('T')[0]);
      const startDate = parseLocal(dateRange.start);
      if (orderDate && startDate && orderDate < startDate) matchesDate = false;
    }
    if (dateRange.end) {
      const orderDate = parseLocal(order.order_date.split('T')[0]);
      const endDate = parseLocal(dateRange.end);
      if (orderDate && endDate && orderDate > endDate) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredOrdersByStatus = useMemo(
    () => ({
      pending: filteredOrders.filter((order) => order.status === 'pending'),
      completed: filteredOrders.filter((order) => order.status === 'completed'),
      cancelled: filteredOrders.filter((order) => order.status === 'cancelled'),
    }),
    [filteredOrders]
  );

  const filteredCounts = useMemo(
    () => ({
      pending: filteredOrdersByStatus.pending.length,
      completed: filteredOrdersByStatus.completed.length,
      cancelled: filteredOrdersByStatus.cancelled.length,
    }),
    [filteredOrdersByStatus]
  );

  const mobileKanbanPages = useMemo(
    () => [
      {
        id: 'pending',
        title: 'Pendientes',
        mobileTitle: 'Pend.',
        badge: filteredCounts.pending,
        content: (
          <div className="h-full min-h-0">
            <OrdersKanban
              orders={filteredOrdersByStatus.pending}
              onView={setSelectedOrder}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              singleColumn
            />
          </div>
        ),
      },
      {
        id: 'completed',
        title: 'Completados',
        mobileTitle: 'Compl.',
        badge: filteredCounts.completed,
        content: (
          <div className="h-full min-h-0">
            <OrdersKanban
              orders={filteredOrdersByStatus.completed}
              onView={setSelectedOrder}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              singleColumn
            />
          </div>
        ),
      },
      {
        id: 'cancelled',
        title: 'Cancelados',
        mobileTitle: 'Canc.',
        badge: filteredCounts.cancelled,
        content: (
          <div className="h-full min-h-0">
            <OrdersKanban
              orders={filteredOrdersByStatus.cancelled}
              onView={setSelectedOrder}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              singleColumn
            />
          </div>
        ),
      },
    ],
    [filteredCounts.cancelled, filteredCounts.completed, filteredCounts.pending, filteredOrdersByStatus.cancelled, filteredOrdersByStatus.completed, filteredOrdersByStatus.pending]
  );

  const hasOrderFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';
  const orderFilterSummary = hasOrderFilters ? 'Con filtros activos' : 'Buscar, fecha y estado';
  const mobileOrderFilters = useMobileFilterDraft({
    value: { searchTerm, statusFilter, dateRange },
    onApply: (nextValue) => {
      setSearchTerm(nextValue.searchTerm);
      setStatusFilter(nextValue.statusFilter);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      searchTerm: '',
      statusFilter: 'all',
      dateRange: getPeriodPreference('orders'),
    }),
  });

  const renderOrdersUtilityBar = () => (
    <MobileUtilityBar>
      <MobileFilterDrawer
        title="Filtros de pedidos"
        label="Filtros"
        summary={orderFilterSummary}
        {...mobileOrderFilters.sheetProps}
      >
        <div data-tour="orders.filters">
          <OrdersToolbar
            search={mobileOrderFilters.draft.searchTerm}
            onSearchChange={(value) => mobileOrderFilters.setDraft((current) => ({ ...current, searchTerm: value }))}
            statusFilter={mobileOrderFilters.draft.statusFilter}
            onStatusFilterChange={(value) => mobileOrderFilters.setDraft((current) => ({ ...current, statusFilter: value }))}
            dateRange={mobileOrderFilters.draft.dateRange}
            onDateRangeChange={(value) => mobileOrderFilters.setDraft((current) => ({ ...current, dateRange: value }))}
            statusCounts={counts}
          />
        </div>
      </MobileFilterDrawer>
    </MobileUtilityBar>
  );

  return (
    <PageLayout data-tour="orders.panel">
      <PageHeader
        title="Pedidos"
        description="Gestiona el flujo de trabajo y entregas."
        mobileFab={{
          label: '+Pedido',
          icon: Plus,
          onClick: () => setIsModalOpen(true),
        }}
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={(
              <div data-tour="orders.primaryAction">
                <PageHeaderActionButton onClick={() => setIsModalOpen(true)} icon={Plus} label="Nuevo pedido" mobileLabel="Pedido" />
              </div>
            )}
            secondary={(
              <Button variant="secondary" onClick={() => setIsSettingsOpen(true)} className="w-full gap-2 sm:w-auto" data-tour="orders.settings">
                <Settings className="w-4 h-4" />
                Configuracion
              </Button>
            )}
          />
        )}
      />

      <ContentAnchor />

      <div className="app-shell-gutter flex-1 min-h-0 py-4">
        <SwipePager
          activePageId={activeTab}
          onPageChange={(id) => setActiveTab(id as 'kanban' | 'table')}
          className="flex-1"
          enableSwipe={false}
          pages={[
            {
              id: 'kanban',
              title: 'Tablero Kanban',
              mobileTitle: 'Kanban',
              icon: Kanban,
              'data-tour': 'orders.board',
              content: (
                <SectionStack>
                  <div className="hidden lg:block">
                    <PageStack>
                      <PageNotice
                        description="Organiza pedidos por estado y revisa rápido qué sigue en preparación, entrega o cierre."
                        dismissible
                      />
                      <ToolbarSection data-tour="orders.filters">
                        <OrdersToolbar
                          search={searchTerm}
                          onSearchChange={setSearchTerm}
                          statusFilter={statusFilter}
                          onStatusFilterChange={setStatusFilter}
                          dateRange={dateRange}
                          onDateRangeChange={setDateRange}
                          statusCounts={counts}
                        />
                      </ToolbarSection>
                    </PageStack>
                  </div>

                  <ContentSection>
                    <MobileUnifiedPageShell utilityBar={renderOrdersUtilityBar()}>
                    <div className="flex-1 min-h-0">
                      <div data-tour="orders.board" className="h-full w-full min-w-0">
                        {isMobile ? (
                          <SwipePager
                            activePageId={activeKanbanPage}
                            onPageChange={(id) => setActiveKanbanPage(id as KanbanStatusPageId)}
                            pages={mobileKanbanPages}
                            className="h-full"
                            mobileBreakpoint={1024}
                            contentScroll="auto"
                            enableSwipe
                            mobileSwitcherLabel="Estado"
                            mobileSwitcherTitle="Cambiar estado"
                          />
                        ) : (
                          <OrdersKanban
                            orders={filteredOrders}
                            onView={setSelectedOrder}
                            onUpdateStatus={handleUpdateStatus}
                            onDelete={handleDelete}
                          />
                        )}
                      </div>
                    </div>
                    </MobileUnifiedPageShell>
                  </ContentSection>
                </SectionStack>
              ),
            },
            {
              id: 'table',
              title: 'Lista de Pedidos',
              mobileTitle: 'Pedidos',
              icon: TableIcon,
              'data-tour': 'orders.card',
              content: (
                <SectionStack>
                  <div className="hidden lg:block">
                    <PageStack>
                      <ToolbarSection data-tour="orders.filters">
                        <OrdersToolbar
                          search={searchTerm}
                          onSearchChange={setSearchTerm}
                          statusFilter={statusFilter}
                          onStatusFilterChange={setStatusFilter}
                          dateRange={dateRange}
                          onDateRangeChange={setDateRange}
                          statusCounts={counts}
                        />
                      </ToolbarSection>
                    </PageStack>
                  </div>

                  <ContentSection>
                    <MobileUnifiedPageShell utilityBar={renderOrdersUtilityBar()}>
                    <div className="flex-1 min-h-0" data-tour="orders.card">
                      <OrdersTable
                        orders={filteredOrders}
                        loading={loading}
                        onView={setSelectedOrder}
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDelete}
                      />
                    </div>
                    </MobileUnifiedPageShell>
                  </ContentSection>
                </SectionStack>
              ),
            },
          ]}
        />
      </div>

      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => activeBusiness && fetchOrders(activeBusiness.id, { start_date: dateRange.start || undefined, end_date: dateRange.end || undefined })}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <CompleteOrderModal
        order={completingOrder}
        onClose={() => setCompletingOrder(null)}
        onConfirm={handleCompleteOrder}
      />

      <OrderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </PageLayout>
  );
};
