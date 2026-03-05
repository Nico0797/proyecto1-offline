import { useEffect, useState, useMemo } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { usePaymentStore } from '../store/paymentStore';
import { useCustomerStore } from '../store/customerStore';
import { useSaleStore } from '../store/saleStore';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { PaymentsKpis } from '../components/Payments/PaymentsKpis';
import { PaymentsToolbar } from '../components/Payments/PaymentsToolbar';
import { ByClientTab } from '../components/Payments/ByClientTab';
import { TransactionsTab } from '../components/Payments/TransactionsTab';
import { OverdueTab } from '../components/Payments/OverdueTab';
import { RegisterPaymentModal } from '../components/Payments/RegisterPaymentModal';
import { ClientReceivableDrawer } from '../components/Payments/ClientReceivableDrawer';
import { WhatsAppPreviewModal } from '../components/Payments/WhatsAppPreviewModal';
import { computeClientReceivables, ClientReceivable } from '../utils/receivables.compute';
import { CreditSettingsModal } from '../components/Customers/CreditSettingsModal';
import { settingsService } from '../services/settingsService';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { PageLayout, PageHeader, PageFilters } from '../components/Layout/PageLayout';
import { SwipePager } from '../components/ui/SwipePager';

export const Payments = () => {
  const { activeBusiness } = useBusinessStore();
  const { payments, loading: loadingPayments, fetchPayments, deletePayment } = usePaymentStore();
  const { customers, loading: loadingCustomers, fetchCustomers } = useCustomerStore();
  const { sales, loading: loadingSales, fetchSales } = useSaleStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('clients'); // clients, transactions, overdue
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('payments'));
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Drawer & Modal States
  const [selectedClient, setSelectedClient] = useState<ClientReceivable | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [whatsAppClient, setWhatsAppClient] = useState<ClientReceivable | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  const [quickPayClient, setQuickPayClient] = useState<number | undefined>(undefined);

  // Load Data
  const refreshData = async () => {
    if (activeBusiness) {
      await Promise.all([
        fetchPayments(activeBusiness.id),
        fetchCustomers(activeBusiness.id),
        fetchSales(activeBusiness.id)
      ]);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeBusiness]);

  // Compute Data
  const clientReceivables = useMemo(() => {
    return computeClientReceivables(customers, sales, payments);
  }, [customers, sales, payments]);

  const filteredClients = useMemo(() => {
    return clientReceivables.filter(c => 
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientReceivables, searchTerm]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = (p.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.note || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateRange.start) {
        matchesDate = matchesDate && new Date(p.payment_date) >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        matchesDate = matchesDate && new Date(p.payment_date) <= new Date(dateRange.end);
      }
      
      return matchesSearch && matchesDate;
    });
  }, [payments, searchTerm, dateRange]);

  // KPIs
  const kpis = useMemo(() => {
    const totalReceivable = clientReceivables.reduce((sum, c) => sum + c.totalDebt, 0);
    const overdueDebt = clientReceivables.reduce((sum, c) => sum + c.overdueDebt, 0);
    
    // Payments this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const paymentsThisPeriod = payments
      .filter(p => new Date(p.payment_date) >= firstDay)
      .reduce((sum, p) => sum + p.amount, 0);
      
    const averagePayment = payments.length > 0 
      ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length 
      : 0;

    return { totalReceivable, overdueDebt, paymentsThisPeriod, averagePayment };
  }, [clientReceivables, payments]);

  // Handlers
  const handleSelectClient = (client: ClientReceivable) => {
    setSelectedClient(client);
    setIsDrawerOpen(true);
  };

  const handleQuickPay = (client: ClientReceivable) => {
    setQuickPayClient(client.customerId);
    setIsRegisterModalOpen(true);
    // Close drawer if open
    setIsDrawerOpen(false);
  };

  const handleWhatsApp = (client: ClientReceivable) => {
    const templates = activeBusiness ? settingsService.getTemplates(activeBusiness.id) : { debt: '' };
    let msg = templates.debt || `Hola {cliente}, le recordamos que tiene un saldo pendiente de {saldo} con {negocio}. Agradecemos su pago.`;

    // Replace placeholders
    msg = msg.replace(/{cliente}/g, client.customerName);
    msg = msg.replace(/{negocio}/g, activeBusiness?.name || 'su negocio');
    msg = msg.replace(/{saldo}/g, `$${client.totalDebt.toLocaleString()}`);
    msg = msg.replace(/{total}/g, `$${client.totalDebt.toLocaleString()}`); // Fallback if user used {total}

    setWhatsAppClient(client);
    setWhatsAppMessage(msg);
    setIsWhatsAppModalOpen(true);
  };

  const handleDeletePayment = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar este pago?')) {
      try {
        await deletePayment(activeBusiness.id, id);
        // Refresh to update balances
        refreshData();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  };

  const handleExport = () => {
    const headers = ['Fecha', 'Cliente', 'Método', 'Nota', 'Monto'];
    const rows = filteredPayments.map(p => [
      new Date(p.payment_date).toLocaleDateString(),
      p.customer_name || 'Unknown',
      p.method,
      p.note || '',
      p.amount.toString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pagos_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const loading = loadingPayments || loadingCustomers || loadingSales;

  return (
    <div className="h-full flex flex-col overflow-hidden" data-tour="payments.panel">
      <PageHeader 
        title="Cartera y Pagos" 
        description="Gestiona cobros, abonos y estado de cuenta"
        action={
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)} className="hidden sm:flex">
                    Config. Plazos
                </Button>
                <Button onClick={() => { setQuickPayClient(undefined); setIsRegisterModalOpen(true); }} className="hidden sm:flex" data-tour="payments.primaryAction.desktop">
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Registrar Pago</span>
                </Button>
                <Button onClick={() => { setQuickPayClient(undefined); setIsRegisterModalOpen(true); }} className="sm:hidden" data-tour="payments.primaryAction.mobile">
                    <Plus className="w-4 h-4" />
                    <span>Pago</span>
                </Button>
            </div>
        }
      />

      <PageFilters>
        <PaymentsToolbar 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={refreshData}
          onExport={handleExport}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </PageFilters>

      <SwipePager
        activePageId={currentTab}
        onPageChange={setCurrentTab}
        className="flex-1"
        pages={[
          {
            id: 'clients',
            title: 'Por Cliente',
            content: (
              <div className="space-y-6">
                <div data-tour="payments.kpis">
                    <PaymentsKpis {...kpis} loading={loading} />
                </div>
                <ByClientTab 
                  data={filteredClients}  
                  loading={loading}
                  onSelectClient={handleSelectClient}
                  onQuickPay={handleQuickPay}
                  onWhatsApp={handleWhatsApp}
                />
              </div>
            )
          },
          {
            id: 'transactions',
            title: 'Transacciones',
            content: (
              <div className="space-y-6">
                 <div data-tour="payments.kpis">
                    <PaymentsKpis {...kpis} loading={loading} />
                </div>
                <TransactionsTab 
                  payments={filteredPayments} 
                  loading={loading}
                  onView={(p) => console.log('View', p)} 
                  onEdit={(p) => console.log('Edit', p)} 
                  onDelete={handleDeletePayment}
                />
              </div>
            )
          },
          {
            id: 'overdue',
            title: 'Vencidas',
            content: (
              <div className="space-y-6">
                 <div data-tour="payments.kpis">
                    <PaymentsKpis {...kpis} loading={loading} />
                </div>
                <OverdueTab 
                  data={clientReceivables} 
                  loading={loading}
                  onSendReminder={handleWhatsApp}
                />
              </div>
            )
          }
        ]}
      />

      {/* Modals & Drawers */}
      <RegisterPaymentModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={refreshData}
        initialCustomerId={quickPayClient}
      />

      <ClientReceivableDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        client={selectedClient}
        sales={sales}
        onQuickPay={handleQuickPay}
        onWhatsApp={handleWhatsApp}
      />

      <CreditSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSuccess={() => {
          refreshData();
          setIsSettingsModalOpen(false);
        }}
      />
      
      <WhatsAppPreviewModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        client={whatsAppClient}
        message={whatsAppMessage}
      />
    </div>
  );
};
