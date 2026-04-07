import { useEffect, useState, useMemo } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { usePaymentStore } from '../store/paymentStore';
import { useCustomerStore } from '../store/customerStore';
import { useAccess } from '../hooks/useAccess';
import { Button } from '../components/ui/Button';
import { Plus, Settings, Users, ArrowRightLeft, AlertOctagon } from 'lucide-react';
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
import { CompactActionGroup, PageHeader, PageLayout, PageNotice, PageStack, PageSummary, PageToolbarCard } from '../components/Layout/PageLayout';
import { SwipePager } from '../components/ui/SwipePager';
import { Payment } from '../store/paymentStore';
import { PaymentFormModal } from '../components/Payments/PaymentFormModal';
import { ReceivablesOverview } from '../types';
import { receivablesService } from '../services/receivablesService';
import {
  MobileFilterDrawer,
  MobileFilterSection,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';

export const Payments = () => {
  const { activeBusiness } = useBusinessStore();
  const { payments, loading: loadingPayments, fetchPayments, deletePayment } = usePaymentStore();
  const { loading: loadingCustomers, fetchCustomers } = useCustomerStore();
  const { hasPermission } = useAccess();
  const [receivablesOverview, setReceivablesOverview] = useState<ReceivablesOverview | null>(null);
  const [loadingReceivables, setLoadingReceivables] = useState(false);

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
  const canReadPayments = hasPermission('receivables.view') || hasPermission('sales.view');
  const canReadCustomers = hasPermission('customers.view');
  const canCreatePayment = hasPermission('receivables.collect');
  const canUpdatePayment = hasPermission('receivables.adjust_terms');
  const canDeletePayment = hasPermission('receivables.collect');
  const canManageTerms = hasPermission('receivables.adjust_terms') || hasPermission('settings.edit');
  const canConfigureTerms = hasPermission('settings.edit');
  const canSendReminder = hasPermission('customers.view');

  // Load Data
  const refreshData = async () => {
    if (activeBusiness) {
      const promises = [];
      
      // Check permissions before fetching
      if (canReadPayments) {
          promises.push(fetchPayments(activeBusiness.id));
      }
      
      if (canReadCustomers) {
          promises.push(fetchCustomers(activeBusiness.id));
      }

      if (canReadPayments || canReadCustomers) {
          setLoadingReceivables(true);
          promises.push(
            receivablesService.getOverview(activeBusiness.id)
              .then((overview) => setReceivablesOverview(overview))
              .finally(() => setLoadingReceivables(false))
          );
      } else {
          setReceivablesOverview(null);
      }
      
      if (promises.length > 0) {
          await Promise.all(promises);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeBusiness, canReadCustomers, canReadPayments]);

  // Compute Data
  const clientReceivables = useMemo(() => {
    return computeClientReceivables(receivablesOverview);
  }, [receivablesOverview]);

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
    const totalReceivable = receivablesOverview?.summary.total_pending || 0;
    const overdueDebt = receivablesOverview?.summary.overdue_total || 0;
    
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
  }, [receivablesOverview, payments, dateRange]);

  // Handlers
  const handleSelectClient = (client: ClientReceivable) => {
    setSelectedClient(client);
    setIsDrawerOpen(true);
  };

  const handleQuickPay = (client: ClientReceivable) => {
    if (!canCreatePayment) return;
    setQuickPayClient(client.customerId);
    setIsRegisterModalOpen(true);
    // Close drawer if open
    setIsDrawerOpen(false);
  };

  const handleWhatsApp = (client: ClientReceivable) => {
    if (!canSendReminder) return;
    const templates = activeBusiness ? settingsService.getTemplates(activeBusiness.id) : { debt: '' };
    const configuredTemplate = activeBusiness?.whatsapp_templates?.collection_message || templates.debt;
    let msg = configuredTemplate || `Hola {cliente}, te escribimos de {negocio} por tu saldo pendiente de {saldo}.`;
    const dueDateText = client.nearestDueDate ? new Date(client.nearestDueDate).toLocaleDateString() : '';
    const statusText = client.status === 'overdue'
      ? `Tu cuenta está vencida desde hace ${client.maxDaysOverdue} días.`
      : client.status === 'due_today'
        ? 'Tu cuenta vence hoy.'
        : client.status === 'due_soon'
          ? `Tu cuenta vence el ${dueDateText}.`
          : 'Tu cuenta está al día, pero aún registra saldo pendiente.';

    msg = msg.replace(/{cliente}/g, client.customerName);
    msg = msg.replace(/{negocio}/g, activeBusiness?.name || 'su negocio');
    msg = msg.replace(/{saldo}/g, `$${client.totalDebt.toLocaleString()}`);
    msg = msg.replace(/{total}/g, `$${client.totalDebt.toLocaleString()}`);
    msg = `${msg}\n\n${statusText}${dueDateText ? `\nFecha de vencimiento: ${dueDateText}.` : ''}\n¿Nos confirmas por favor cuándo podrías realizar el pago?\n\nGracias.`;

    setWhatsAppClient(client);
    setWhatsAppMessage(msg);
    setIsWhatsAppModalOpen(true);
  };

  const handleDeletePayment = async (id: number) => {
    if (!activeBusiness) return;
    if (!canDeletePayment) return;
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

  const loading = loadingPayments || loadingCustomers || loadingReceivables;
  const currentTabGuidance = useMemo(() => {
    if (currentTab === 'transactions') {
      return {
        title: 'Aquí confirmas lo que ya entró',
        description: 'Usa esta vista para revisar cobros registrados, corregir referencias y validar por dónde entró el dinero.',
      };
    }

    if (currentTab === 'overdue') {
      return {
        title: 'Empieza por lo vencido o por vencer',
        description: 'Este corte te ayuda a priorizar a quién escribir o cobrar hoy, sin revisar cliente por cliente.',
      };
    }

    return {
      title: 'Empieza por clientes con saldo',
      description: 'Desde aquí ves quién debe, cuánto y quién conviene cobrar primero. Luego registras el abono en un paso guiado.',
    };
  }, [currentTab]);

  const hasPaymentFilters = searchTerm.trim().length > 0 || dateRange.preset !== 'month';
  const paymentFilterSummary = hasPaymentFilters ? 'Con filtros activos' : 'Buscar y periodo';
  const paymentSummaryLabel = currentTab === 'clients'
    ? `${filteredClients.length} cliente(s)`
    : `${filteredPayments.length} movimiento(s)`;
  const mobilePaymentFilters = useMobileFilterDraft({
    value: { searchTerm, dateRange },
    onApply: (nextValue) => {
      setSearchTerm(nextValue.searchTerm);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      searchTerm: '',
      dateRange: getPeriodPreference('payments'),
    }),
  });

  const mobilePaymentsUtilityBar = (
    <MobileUtilityBar>
      <MobileFilterDrawer summary={paymentFilterSummary} {...mobilePaymentFilters.sheetProps}>
        <MobileFilterSection title="Filtrar cobros" description="Busca primero y ajusta el periodo solo cuando aporte contexto.">
          <div data-tour="payments.filters">
            <PaymentsToolbar
              searchTerm={mobilePaymentFilters.draft.searchTerm}
              onSearchChange={(value) => mobilePaymentFilters.setDraft((current) => ({ ...current, searchTerm: value }))}
              dateRange={mobilePaymentFilters.draft.dateRange}
              onDateRangeChange={(value) => mobilePaymentFilters.setDraft((current) => ({ ...current, dateRange: value }))}
            />
          </div>
        </MobileFilterSection>
      </MobileFilterDrawer>
      {currentTab === 'clients' ? (
        <MobileSummaryDrawer summary={paymentSummaryLabel}>
          <div data-tour="payments.kpis">
            <PaymentsKpis {...kpis} loading={loading} />
          </div>
        </MobileSummaryDrawer>
      ) : null}
      <MobileHelpDisclosure summary="Como usar cobros">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Mantén la pantalla limpia: usa Filtros para buscar o cambiar periodo y entra a cada pestaña solo para gestionar clientes, movimientos o vencimientos.
        </p>
      </MobileHelpDisclosure>
    </MobileUtilityBar>
  );

  return (
    <PageLayout data-tour="payments.panel">
      <PageHeader 
        title="Cobros y saldos" 
        description="Revisa quién te debe, registra abonos y sigue los saldos pendientes."
        action={(canCreatePayment || (canConfigureTerms && currentTab === 'clients')) ? (
          <CompactActionGroup
            collapseLabel="Mas"
            primary={canCreatePayment ? (
              <div data-tour="payments.primaryAction.mobile" className="w-full sm:w-auto">
                <Button onClick={() => { setQuickPayClient(undefined); setIsRegisterModalOpen(true); }} className="w-full sm:w-auto" data-tour="payments.primaryAction.desktop">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Registrar cobro</span>
                  <span className="sm:hidden">Cobro</span>
                </Button>
              </div>
            ) : undefined}
            secondary={canConfigureTerms && currentTab === 'clients' ? (
              <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)} className="w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2" />
                Configurar plazos
              </Button>
            ) : undefined}
          />
        ) : undefined}
      />

      <SwipePager
        activePageId={currentTab}
        onPageChange={setCurrentTab}
        className="flex-1"
        pages={[
          {
            id: 'clients',
            title: 'Clientes con saldo',
            mobileTitle: 'Clientes',
            icon: Users,
            'data-tour': 'payments.tabs.all',
            content: (
              <MobileUnifiedPageShell utilityBar={mobilePaymentsUtilityBar}>
                <PageStack>
                  <PageNotice
                    className="hidden lg:block"
                    title={currentTabGuidance.title}
                    description={currentTabGuidance.description}
                    dismissible
                  />
                  <PageSummary className="hidden lg:block" title="Resumen de cobros" description="Ten claro cuánto falta por recuperar antes de entrar al detalle.">
                    <div data-tour="payments.kpis">
                      <PaymentsKpis {...kpis} loading={loading} />
                    </div>
                  </PageSummary>
                  <PageToolbarCard className="app-toolbar hidden lg:block" data-tour="payments.filters">
                    <PaymentsToolbar 
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                    />
                  </PageToolbarCard>
                  <div data-tour="payments.list">
                    <ByClientTab 
                      data={filteredClients}  
                      loading={loading}
                      onSelectClient={handleSelectClient}
                      onQuickPay={handleQuickPay}
                      onWhatsApp={handleWhatsApp}
                      canQuickPay={canCreatePayment}
                      canSendReminder={canSendReminder}
                    />
                  </div>
                </PageStack>
              </MobileUnifiedPageShell>
            )
          },
          {
            id: 'transactions',
            title: 'Cobros registrados',
            mobileTitle: 'Cobros',
            icon: ArrowRightLeft,
            content: (
              <MobileUnifiedPageShell utilityBar={mobilePaymentsUtilityBar}>
                <PageStack>
                  <PageNotice
                    className="hidden lg:block"
                    title={currentTabGuidance.title}
                    description={currentTabGuidance.description}
                    dismissible
                  />
                  <PageToolbarCard className="app-toolbar hidden lg:block" data-tour="payments.filters">
                    <PaymentsToolbar 
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                    />
                  </PageToolbarCard>
                  <div data-tour="payments.table">
                    <TransactionsTab 
                      payments={filteredPayments} 
                      loading={loading}
                      onView={(p) => { setSelectedPayment(p); setPaymentModalMode('view'); setIsPaymentModalOpen(true); }} 
                      onEdit={(p) => { setSelectedPayment(p); setPaymentModalMode('edit'); setIsPaymentModalOpen(true); }} 
                      onDelete={handleDeletePayment}
                      canEdit={canUpdatePayment}
                      canDelete={canDeletePayment}
                    />
                  </div>
                </PageStack>
              </MobileUnifiedPageShell>
            )
          },
          {
            id: 'overdue',
            title: 'Por vencer',
            mobileTitle: 'Por vencer',
            icon: AlertOctagon,
            'data-tour': 'payments.tabs.overdue',
            content: (
              <MobileUnifiedPageShell utilityBar={mobilePaymentsUtilityBar}>
                <PageStack>
                  <PageNotice
                    className="hidden lg:block"
                    title={currentTabGuidance.title}
                    description={currentTabGuidance.description}
                    dismissible
                  />
                  <PageToolbarCard className="app-toolbar hidden lg:block" data-tour="payments.filters">
                    <PaymentsToolbar 
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                    />
                  </PageToolbarCard>
                  <div data-tour="payments.list">
                    <OverdueTab 
                      data={clientReceivables} 
                      loading={loading}
                      onSendReminder={handleWhatsApp}
                    />
                  </div>
                </PageStack>
              </MobileUnifiedPageShell>
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
        receivables={receivablesOverview?.receivables || []}
      />

      <ClientReceivableDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        client={selectedClient}
        onQuickPay={handleQuickPay}
        onWhatsApp={handleWhatsApp}
        onUpdated={refreshData}
        canQuickPay={canCreatePayment}
        canSendReminder={canSendReminder}
        canManageTerms={canManageTerms}
      />

      {canConfigureTerms && (
        <CreditSettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSuccess={() => {
            refreshData();
            setIsSettingsModalOpen(false);
          }}
        />
      )}
      
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
        mode={paymentModalMode === 'edit' && !canUpdatePayment ? 'view' : paymentModalMode}
        onSuccess={refreshData}
        canEdit={canUpdatePayment}
      />
    </PageLayout>
  );
};
