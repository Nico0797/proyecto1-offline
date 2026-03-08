import { useEffect, useState, useMemo } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { usePaymentStore } from '../store/paymentStore';
import { useCustomerStore } from '../store/customerStore';
import { useSaleStore } from '../store/saleStore';
import { Button } from '../components/ui/Button';
import { Plus, Settings } from 'lucide-react';
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
import { PageHeader } from '../components/Layout/PageLayout';
import { SwipePager } from '../components/ui/SwipePager';
import { Payment } from '../store/paymentStore';
import { PaymentFormModal } from '../components/Payments/PaymentFormModal';

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
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState<'view' | 'edit'>('view');

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
        const start = new Date(dateRange.start);
        matchesDate = matchesDate && new Date(p.payment_date) >= start;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23,59,59,999);
        matchesDate = matchesDate && new Date(p.payment_date) <= end;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [payments, searchTerm, dateRange]);

  // KPIs
  const kpis = useMemo(() => {
    const totalReceivable = clientReceivables.reduce((sum, c) => sum + c.totalDebt, 0);
    const overdueDebt = clientReceivables.reduce((sum, c) => sum + c.overdueDebt, 0);
    
    // Payments in current selected period
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;
    if (end) end.setHours(23,59,59,999);
    const paymentsThisPeriod = payments
      .filter(p => {
        const d = new Date(p.payment_date);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      })
      .reduce((sum, p) => sum + p.amount, 0);
      
    const averagePayment = payments.length > 0 
      ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length 
      : 0;

    return { totalReceivable, overdueDebt, paymentsThisPeriod, averagePayment };
  }, [clientReceivables, payments, dateRange]);

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
                {/* Mobile Actions */}
                <div className="flex gap-2 sm:hidden">
                    <Button variant="secondary" size="icon" onClick={() => setIsSettingsModalOpen(true)} title="Configurar Plazos">
                        <Settings className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => { setQuickPayClient(undefined); setIsRegisterModalOpen(true); }} data-tour="payments.primaryAction.mobile">
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Pago</span>
                    </Button>
                </div>
            </div>
        }
      />

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
                
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <PaymentsToolbar 
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
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
                
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <PaymentsToolbar 
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>

                <TransactionsTab 
                  payments={filteredPayments} 
                  loading={loading}
                  onView={(p) => { setSelectedPayment(p); setPaymentModalMode('view'); setIsPaymentModalOpen(true); }} 
                  onEdit={(p) => { setSelectedPayment(p); setPaymentModalMode('edit'); setIsPaymentModalOpen(true); }} 
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
                
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <PaymentsToolbar 
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
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

      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        payment={selectedPayment}
        mode={paymentModalMode}
        onSuccess={refreshData}
      />
    </div>
  );
};
