import React, { useEffect, useMemo, useState } from 'react';
import { Customer, CustomerCommercialSummary, CustomerHistoryEntry } from '../../types';
import { useNavigate } from 'react-router-dom';
import { formatCOP } from './helpers';
import { Button } from '../ui/Button';
import { Phone, Mail, MapPin, Calendar, DollarSign, Edit2, MessageCircle, Plus, ArrowLeft, Activity, ReceiptText, ShoppingCart, Wallet, Clock3 } from 'lucide-react';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { useBusinessStore } from '../../store/businessStore';
import { customerDetailService } from '../../services/customerDetailService';

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleDateString();
};

const buildFallbackSummary = (customer: Customer): CustomerCommercialSummary => ({
  total_purchases_value: customer.total_purchases_value || 0,
  total_purchases_count: customer.total_purchases_count || 0,
  last_purchase_date: customer.last_purchase_date || null,
  last_purchase_value: customer.last_purchase_value || 0,
  outstanding_balance: customer.total_balance || customer.balance || 0,
  sales_outstanding_balance: customer.sales_balance || 0,
  invoice_outstanding_balance: customer.invoice_balance || 0,
  total_paid: customer.total_paid || 0,
  average_ticket: customer.average_ticket || 0,
  customer_status: customer.customer_status || 'new',
  customer_status_label: customer.customer_status_label || 'Sin movimientos',
  sales_count: customer.sales_count || 0,
  sales_total: customer.sales_total || 0,
  payment_count: customer.payment_count || 0,
  orders_count: customer.orders_count || 0,
  orders_total: customer.orders_total || 0,
  last_order_date: customer.last_order_date || null,
  last_order_value: customer.last_order_value || 0,
  invoice_count: customer.invoice_count || 0,
  invoice_total: customer.invoice_total || 0,
  invoice_payment_count: customer.invoice_payment_count || 0,
  last_activity_date: customer.last_activity_date || null,
});

const getHistoryTone = (entry: CustomerHistoryEntry) => {
  if (entry.entry_type === 'payment' || entry.entry_type === 'invoice_payment') {
    return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10';
  }
  if (entry.entry_type === 'invoice_refund' || entry.entry_type === 'invoice_reversal') {
    return 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10';
  }
  if (entry.entry_type === 'order') {
    return 'border-violet-200 bg-violet-50 dark:border-violet-900/30 dark:bg-violet-900/10';
  }
  return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/40';
};

const getHistoryIcon = (entry: CustomerHistoryEntry) => {
  if (entry.entry_type === 'payment' || entry.entry_type === 'invoice_payment') return Wallet;
  if (entry.entry_type === 'invoice' || entry.entry_type === 'invoice_refund' || entry.entry_type === 'invoice_reversal') return ReceiptText;
  if (entry.entry_type === 'order') return Clock3;
  return ShoppingCart;
};

const formatHistoryAmount = (entry: CustomerHistoryEntry) => {
  const amount = entry.signed_amount ?? entry.amount;
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatCOP(Math.abs(amount))}`;
};

interface ClientDetailPanelProps {
  customer: Customer | null;
  onEdit: () => void;
  onClose: () => void; // For mobile
  showReceivables?: boolean;
  onCustomerHydrated?: (customer: Customer) => void;
}

export const ClientDetailPanel: React.FC<ClientDetailPanelProps> = ({
  customer,
  onEdit,
  onClose,
  showReceivables = true,
  onCustomerHydrated,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'debts' | 'history'>('summary');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(customer);
  const [historyEntries, setHistoryEntries] = useState<CustomerHistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();

  const effectiveCustomer = detailCustomer || customer;
  const customerSummary = useMemo(() => {
    if (!effectiveCustomer) return null;
    return effectiveCustomer.commercial_summary || buildFallbackSummary(effectiveCustomer);
  }, [effectiveCustomer]);

  useEffect(() => {
    if (!showReceivables && activeTab === 'debts') {
      setActiveTab('summary');
    }
  }, [showReceivables, activeTab]);

  useEffect(() => {
    setDetailCustomer(customer);
  }, [customer]);

  useEffect(() => {
    setHistoryEntries([]);
    setHistoryPage(1);
    setHistoryHasMore(false);
    setDetailError(null);
    setHistoryError(null);
  }, [customer?.id]);

  useEffect(() => {
    if (!activeBusiness?.id || !customer?.id) return;

    let cancelled = false;
    const fetchDetail = async () => {
      try {
        setIsLoadingDetail(true);
        setDetailError(null);
        const detail = await customerDetailService.getCustomerDetail(activeBusiness.id, customer.id);
        if (!cancelled) {
          setDetailCustomer(detail);
          onCustomerHydrated?.(detail);
        }
      } catch (error: any) {
        if (!cancelled) {
          setDetailError(error?.response?.data?.error || 'No fue posible cargar el detalle del cliente.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id, customer?.id, detailReloadToken, onCustomerHydrated]);

  useEffect(() => {
    if (activeTab !== 'history' || !activeBusiness?.id || !customer?.id) return;

    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        setHistoryError(null);
        const response = await customerDetailService.getCustomerHistory(activeBusiness.id, customer.id, {
          page: historyPage,
          per_page: 12,
        });
        if (!cancelled) {
          setHistoryEntries((current) => (historyPage === 1 ? response.history : [...current, ...response.history]));
          setHistoryHasMore(!!response.pagination?.has_more);
        }
      } catch (error: any) {
        if (!cancelled) {
          setHistoryError(error?.response?.data?.error || 'No fue posible cargar el historial del cliente.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [activeTab, activeBusiness?.id, customer?.id, historyPage, historyReloadToken]);

  if (!effectiveCustomer) {
    return (
      <div className="h-full hidden lg:flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 m-4">
        <p>Selecciona un cliente para ver detalles</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden absolute inset-0 lg:relative z-20">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex justify-between items-start mb-4 md:mb-0">
           <div className="flex items-center gap-3 md:gap-4">
              <Button variant="ghost" size="sm" className="lg:hidden mr-1 px-2" onClick={onClose}>
                 <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg shrink-0">
                  {effectiveCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{effectiveCustomer.name}</h2>
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {effectiveCustomer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {effectiveCustomer.phone}</span>}
                      {effectiveCustomer.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {effectiveCustomer.email}</span>}
                  </div>
                  {customerSummary ? (
                    <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-200">
                      {customerSummary.customer_status_label}
                    </div>
                  ) : null}
              </div>
           </div>
           <div className="flex gap-2 shrink-0">
               <Button variant="secondary" size="sm" onClick={onEdit} className="hidden md:flex">
                   <Edit2 className="w-4 h-4 mr-2" /> Editar
               </Button>
               <Button size="sm" variant="secondary" onClick={onEdit} className="md:hidden px-2">
                   <Edit2 className="w-4 h-4" />
               </Button>
               
               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none hidden md:flex" onClick={() => setIsWhatsAppOpen(true)} data-tour="customers.whatsappBtn">
                   <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
               </Button>
               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none md:hidden px-2" onClick={() => setIsWhatsAppOpen(true)} data-tour="customers.whatsappBtn">
                   <MessageCircle className="w-4 h-4" />
               </Button>
           </div>
        </div>
        
        {/* Quick Stats Strip */}
        <div className={`grid gap-2 md:gap-4 mt-4 md:mt-6 ${showReceivables ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-3'}`}>
            {showReceivables && (
              <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Deuda Total</p>
                  <p className={`text-sm md:text-lg font-bold ${(customerSummary?.outstanding_balance || effectiveCustomer.balance) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                      {formatCOP(customerSummary?.outstanding_balance || effectiveCustomer.balance || 0)}
                  </p>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Compras</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">{formatCOP(customerSummary?.total_purchases_value || 0)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Última Compra</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">{customerSummary?.last_purchase_value ? formatCOP(customerSummary.last_purchase_value) : 'N/A'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Ticket Prom.</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">{formatCOP(customerSummary?.average_ticket || 0)}</p>
            </div>
        </div>
        {isLoadingDetail && !detailCustomer ? <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Actualizando detalle comercial...</p> : null}
        {detailError ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-amber-600 dark:text-amber-300">
            <span>{detailError}</span>
            <Button variant="secondary" size="sm" onClick={() => setDetailReloadToken((value) => value + 1)}>
              Reintentar detalle
            </Button>
          </div>
        ) : null}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 overflow-x-auto">
          <button
            className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('summary')}
          >
            Resumen
          </button>
          {showReceivables && (
            <button
              className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'debts' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              onClick={() => setActiveTab('debts')}
              data-tour="customers.payment"
            >
              Deudas
            </button>
          )}
          <button
            className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('history')}
            data-tour="customers.history"
          >
            Historial
          </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'summary' && (
              <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><ShoppingCart className="h-4 w-4" /> Compras</div>
                          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{customerSummary?.total_purchases_count || 0}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatCOP(customerSummary?.total_purchases_value || 0)} acumulados</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><Wallet className="h-4 w-4" /> Pagos</div>
                          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatCOP(customerSummary?.total_paid || 0)}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{customerSummary?.payment_count || 0} movimientos registrados</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><ReceiptText className="h-4 w-4" /> Facturas</div>
                          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{customerSummary?.invoice_count || 0}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatCOP(customerSummary?.invoice_total || 0)} emitidos</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><Clock3 className="h-4 w-4" /> Pedidos</div>
                          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{customerSummary?.orders_count || 0}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatCOP(customerSummary?.orders_total || 0)} comprometidos</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Información de Contacto</h3>
                          <div className="space-y-3 text-sm">
                              <div className="flex items-start gap-3" data-tour="customers.address">
                                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <span className="text-gray-600 dark:text-gray-300">{effectiveCustomer.address || 'Sin dirección registrada'}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <span className="text-gray-600 dark:text-gray-300">Cliente desde: {new Date(effectiveCustomer.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                  <Activity className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <span className="text-gray-600 dark:text-gray-300">Última actividad: {formatDate(customerSummary?.last_activity_date)}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                  <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <span className="text-gray-600 dark:text-gray-300">Última compra: {formatDate(customerSummary?.last_purchase_date)} · {customerSummary?.last_purchase_value ? formatCOP(customerSummary.last_purchase_value) : 'N/A'}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-4">
                          <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Resumen Comercial</h3>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">Saldo pendiente</p>
                                  <p className={`mt-2 text-lg font-bold ${(customerSummary?.outstanding_balance || 0) > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>{formatCOP(customerSummary?.outstanding_balance || 0)}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ventas: {formatCOP(customerSummary?.sales_outstanding_balance || 0)} · Facturas: {formatCOP(customerSummary?.invoice_outstanding_balance || 0)}</p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">Ticket promedio</p>
                                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{formatCOP(customerSummary?.average_ticket || 0)}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Basado en {customerSummary?.total_purchases_count || 0} compras</p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">Último pedido</p>
                                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{customerSummary?.last_order_value ? formatCOP(customerSummary.last_order_value) : 'N/A'}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(customerSummary?.last_order_date)}</p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">Estado</p>
                                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{customerSummary?.customer_status_label || 'Sin movimientos'}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cobros registrados: {customerSummary?.invoice_payment_count || 0} de facturas</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Notas Internas</h3>
                      {effectiveCustomer.notes && effectiveCustomer.notes.trim() ? (
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                              {effectiveCustomer.notes}
                            </div>
                          ) : (
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30 text-sm text-yellow-800 dark:text-yellow-200" data-tour="customers.tags">
                              <p>No hay notas registradas para este cliente.</p>
                            </div>
                          )}
                      </div>
              </div>
          )}

          {showReceivables && activeTab === 'debts' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">Cuentas Pendientes</h3>
                      <Button size="sm" onClick={() => navigate('/payments')}>
                          <Plus className="w-4 h-4 mr-2" /> Gestionar cartera
                      </Button>
                  </div>
                  
                  {(customerSummary?.outstanding_balance || effectiveCustomer.balance) > 0 ? (
                      <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saldo</p>
                                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCOP(customerSummary?.outstanding_balance || effectiveCustomer.balance || 0)}</p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estado</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{effectiveCustomer.receivable_status_label || customerSummary?.customer_status_label || 'Pendiente'}</p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vencimiento</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {effectiveCustomer.receivable_due_date ? new Date(effectiveCustomer.receivable_due_date).toLocaleDateString() : 'Sin fecha'}
                                  </p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cuentas</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{effectiveCustomer.receivable_invoice_count || 0} abiertas</p>
                              </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saldo por ventas</p>
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCOP(customerSummary?.sales_outstanding_balance || effectiveCustomer.sales_balance || 0)}</p>
                              </div>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saldo por facturas</p>
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCOP(customerSummary?.invoice_outstanding_balance || effectiveCustomer.invoice_balance || 0)}</p>
                              </div>
                          </div>
                          <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 p-4">
                              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                                  El detalle por documento, ajuste de plazo y recordatorios de cobro se gestiona en la vista de cartera.
                              </p>
                              <div className="mt-3">
                                  <Button size="sm" onClick={() => navigate('/payments')}>
                                      Ir a Cartera y Pagos
                                  </Button>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-green-200 dark:border-green-900/30">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600 dark:text-green-400">
                              <DollarSign className="w-6 h-6" />
                          </div>
                          <p className="text-gray-900 dark:text-white font-medium">¡Todo al día!</p>
                          <p className="text-sm text-gray-500">Este cliente no tiene deudas pendientes.</p>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'history' && (
              <div className="space-y-4">
                  {historyError ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
                      <div>{historyError}</div>
                      <Button variant="secondary" size="sm" className="mt-3" onClick={() => setHistoryReloadToken((value) => value + 1)}>
                        Reintentar historial
                      </Button>
                    </div>
                  ) : null}

                  {isLoadingHistory && historyEntries.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Cargando historial...</div>
                  ) : historyEntries.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Todavía no hay movimientos comerciales para este cliente.</div>
                  ) : (
                    <div className="space-y-3">
                      {historyEntries.map((entry) => {
                        const Icon = getHistoryIcon(entry);
                        return (
                          <div key={entry.id} className={`rounded-xl border p-4 ${getHistoryTone(entry)}`}>
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="rounded-lg border border-white/40 bg-white/60 p-2 dark:border-white/10 dark:bg-white/5">
                                    <Icon className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white">{entry.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{entry.subtitle || entry.document_label || 'Movimiento comercial'}</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="rounded-full border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900/40">{formatDate(entry.date)}</span>
                                  {entry.status ? <span className="rounded-full border border-gray-200 bg-white px-2 py-1 capitalize dark:border-gray-700 dark:bg-gray-900/40">{String(entry.status).replace(/_/g, ' ')}</span> : null}
                                  {entry.balance != null ? <span className="rounded-full border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900/40">Saldo: {formatCOP(entry.balance)}</span> : null}
                                </div>
                                {entry.note ? <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{entry.note}</p> : null}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className={`text-lg font-bold ${entry.signed_amount < 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>{formatHistoryAmount(entry)}</p>
                                {entry.treasury_account_name ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{entry.treasury_account_name}</p> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {historyHasMore ? (
                    <div className="flex justify-center">
                      <Button variant="secondary" onClick={() => setHistoryPage((page) => page + 1)} disabled={isLoadingHistory}>
                        {isLoadingHistory ? 'Cargando...' : 'Ver más movimientos'}
                      </Button>
                    </div>
                  ) : null}
              </div>
          )}
      </div>

      <WhatsAppPreviewModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        phoneNumber={effectiveCustomer.phone || ''}
        customerName={effectiveCustomer.name}
        balance={customerSummary?.outstanding_balance || effectiveCustomer.balance || 0}
        messageType={(customerSummary?.outstanding_balance || effectiveCustomer.balance || 0) > 0 ? 'collection' : 'greeting'}
      />
    </div>
  );
};
