import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import { useOrderStore, Order } from '../store/orderStore';
import { Button } from '../components/ui/Button';
import { Plus, Settings } from 'lucide-react';
import { CreateOrderModal } from '../components/Orders/CreateOrderModal';
import { OrdersKpis } from '../components/Orders/OrdersKpis';
import { OrdersToolbar } from '../components/Orders/OrdersToolbar';
import { OrdersTable } from '../components/Orders/OrdersTable';
import { OrdersKanban } from '../components/Orders/OrdersKanban';
import { OrderDetailDrawer } from '../components/Orders/OrderDetailDrawer';
import { CompleteOrderModal } from '../components/Orders/CompleteOrderModal';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { DataTableContainer } from '../components/ui/DataTableContainer';

export const Orders = () => {
  const { activeBusiness } = useBusinessStore();
  const { orders, loading, fetchOrders, updateOrderStatus, deleteOrder } = useOrderStore();
  
  const [activeTab, setActiveTab] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('orders'));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && activeBusiness) {
      fetchOrders(activeBusiness.id, { start_date: dateRange.start || undefined, end_date: dateRange.end || undefined });
    }
  }, [isAuthenticated, activeBusiness, dateRange.start, dateRange.end]);

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
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
    } catch (error) {
        console.error('Error updating order status:', error);
    }
  };

  const handleCompleteOrder = async (date: string) => {
    if (!activeBusiness || !completingOrder) return;
    try {
      await updateOrderStatus(activeBusiness.id, completingOrder.id, 'completed', date);
      setCompletingOrder(null);
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Fecha', 'Cliente', 'Estado', 'Total', 'Items', 'Nota'];
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map(o => [
        o.id,
        new Date(o.order_date).toISOString().split('T')[0],
        `"${o.customer_name || 'Cliente Casual'}"`,
        o.status,
        o.total,
        o.items.length,
        `"${o.note || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pedidos_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const parseLocal = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.id.toString().includes(searchTerm);
    
    let matchesStatus = true;
    if (statusFilter !== 'all') matchesStatus = order.status === statusFilter;

    let matchesDate = true;
    // Use parseLocal to properly compare dates avoiding timezone issues
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

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6" data-tour="orders.panel">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Gestiona el flujo de trabajo y entregas.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {}} className="gap-2" data-tour="orders.settings">
                <Settings className="w-4 h-4" />
                Configuración
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2" data-tour="orders.primaryAction">
                <Plus className="w-4 h-4" />
                Nuevo Pedido
            </Button>
        </div>
      </div>

      <div data-tour="orders.kpis" className="flex-shrink-0">
        <OrdersKpis orders={orders} onFilterStatus={setStatusFilter} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex gap-6 overflow-x-auto">
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'kanban' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('kanban')}
          >
            Tablero Kanban
          </button>
          <button
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'table' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('table')}
          >
            Lista de Pedidos
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-shrink-0">
          <OrdersToolbar 
             search={searchTerm}
             onSearchChange={setSearchTerm}
             statusFilter={statusFilter}
             onStatusFilterChange={setStatusFilter}
             dateRange={dateRange}
             onDateRangeChange={setDateRange}
             onExport={handleExport}
          />
          </div>

          <div className="flex-1 min-h-0">
             {activeTab === 'kanban' && (
                 <div data-tour="orders.board" className="h-full overflow-x-auto">
                 <OrdersKanban 
                    orders={filteredOrders}
                    onView={setSelectedOrder}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                 />
                 </div>
             )}

             {activeTab === 'table' && (
                 <DataTableContainer>
                 <OrdersTable 
                    orders={filteredOrders}
                    loading={loading}
                    onView={setSelectedOrder}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                 />
                 </DataTableContainer>
             )}
          </div>
      </div>

      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => activeBusiness && fetchOrders(activeBusiness.id, { start_date: dateRange.start || undefined, end_date: dateRange.end || undefined })}
        // onSuccess={() => activeBusiness && fetchOrders(activeBusiness.id)}
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
    </div>
  );
};

