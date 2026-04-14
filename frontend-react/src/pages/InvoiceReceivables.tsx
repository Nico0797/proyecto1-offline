import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Eye,
  FileSpreadsheet,
  ReceiptText,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InvoiceMessageModal } from '../components/Invoices/InvoiceMessageModal';
import {
  buildInvoiceOfflineReminderMessage,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceCollectionLabel,
  getInvoiceCollectionTone,
  getInvoiceSyncMeta,
  INVOICE_STATUS_META,
} from '../components/Invoices/invoiceHelpers';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { Button } from '../components/ui/Button';
import { FilterBar, FilterDateRange, FilterSearch, FilterSelect } from '../components/ui/FilterBar';
import {
  CompactActionGroup,
  DataTableContainer,
  PageBody,
  PageFilters,
  PageHeader,
  PageLayout,
} from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileFilterSection,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import {
  InvoiceReceivable,
  InvoiceReceivableFilterStatus,
  InvoiceReceivablesOverview,
} from '../types';
import { invoicesService } from '../services/invoicesService';
import { OFFLINE_SNAPSHOT_APPLIED_EVENT, offlineSyncService } from '../services/offlineSyncService';
import { useBusinessStore } from '../store/businessStore';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import { useCustomerStore } from '../store/customerStore';

const STATUS_OPTIONS: Array<{ value: InvoiceReceivableFilterStatus; label: string }> = [
  { value: 'all', label: 'Todo el seguimiento' },
  { value: 'unpaid', label: 'Pendientes sin abonos' },
  { value: 'partial', label: 'Con abonos' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const buildSummaryCards = (overview: InvoiceReceivablesOverview | null, currency: string) => {
  const summary = overview?.summary;
  return [
    {
      label: 'Saldo pendiente',
      value: formatInvoiceMoney(summary?.total_outstanding || 0, currency),
      helper: `${summary?.unpaid_invoice_count || 0} factura(s) con saldo · ${summary?.customer_count || 0} cliente(s)`,
    },
    {
      label: 'Saldo vencido',
      value: formatInvoiceMoney(summary?.overdue_total || 0, currency),
      helper: `${summary?.overdue_invoice_count || 0} factura(s) vencida(s)`,
    },
    {
      label: 'Cobrado en el corte',
      value: formatInvoiceMoney(summary?.amount_collected_in_range || 0, currency),
      helper: `Tasa de recaudo ${Number(summary?.collection_rate || 0).toFixed(1)}%`,
    },
    {
      label: 'Facturado en el corte',
      value: formatInvoiceMoney(summary?.invoiced_total || 0, currency),
      helper: summary?.average_days_to_collect != null
        ? `Promedio de cobro ${summary.average_days_to_collect.toFixed(1)} dia(s)`
        : 'Sin pagos completos suficientes para promedio',
    },
  ];
};

const StatusBadge = ({ status }: { status: InvoiceReceivable['status'] }) => {
  const meta = INVOICE_STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const defaultOverview: InvoiceReceivablesOverview = {
  summary: {
    total_outstanding: 0,
    overdue_total: 0,
    due_today_total: 0,
    due_soon_total: 0,
    current_total: 0,
    invoiced_total: 0,
    amount_collected_in_range: 0,
    collection_rate: 0,
    average_days_to_collect: null,
    customer_count: 0,
    unpaid_invoice_count: 0,
    overdue_invoice_count: 0,
    partial_invoice_count: 0,
    total_invoice_count: 0,
  },
  customers: [],
  receivables: [],
};

export const InvoiceReceivables = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();

  const [overview, setOverview] = useState<InvoiceReceivablesOverview>(defaultOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceReceivableFilterStatus>('all');
  const [customerId, setCustomerId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [messageModal, setMessageModal] = useState<{
    open: boolean;
    title: string;
    description?: string;
    contactName?: string | null;
    phone?: string | null;
    message: string;
  }>({
    open: false,
    title: '',
    description: '',
    contactName: '',
    phone: '',
    message: '',
  });

  useEffect(() => {
    if (!activeBusiness) return;
    fetchCustomers(activeBusiness.id).catch(() => undefined);
  }, [activeBusiness, fetchCustomers]);

  useEffect(() => {
    if (!activeBusiness) return;
    let active = true;
    setLoading(true);
    setError(null);

    invoicesService.getReceivables(activeBusiness.id, {
      status,
      search: search.trim() || undefined,
      customer_id: customerId !== 'all' ? Number(customerId) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
      .then((response) => {
        if (!active) return;
        setOverview(response);
      })
      .catch((requestError: any) => {
        if (!active) return;
        if (requestError?.isOfflineRequestError || !requestError?.response) {
          offlineSyncService.buildInvoiceReceivablesOverviewFromLocal(activeBusiness.id, {
            status,
            search: search.trim() || undefined,
            customer_id: customerId !== 'all' ? Number(customerId) : undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          })
            .then((response) => {
              if (!active) return;
              setOverview(response);
              setError(null);
            })
            .catch((offlineError: any) => {
              if (!active) return;
              setError(offlineError?.message || 'No fue posible cargar la cartera de facturas');
            })
            .finally(() => {
              if (active) setLoading(false);
            });
          return;
        }
        setError(requestError?.response?.data?.error || 'No fue posible cargar la cartera de facturas');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeBusiness, customerId, endDate, refreshNonce, search, startDate, status]);

  useEffect(() => {
    if (!activeBusiness || typeof window === 'undefined') return;
    const businessId = activeBusiness.id;
    const handleSnapshotApplied = (event: Event) => {
      const customEvent = event as CustomEvent<{ businessIds?: number[] }>;
      const businessIds = customEvent.detail?.businessIds || [];
      if (businessIds.length > 0 && !businessIds.includes(businessId)) {
        return;
      }
      setRefreshNonce((value) => value + 1);
    };

    window.addEventListener(OFFLINE_SNAPSHOT_APPLIED_EVENT, handleSnapshotApplied as EventListener);
    return () => {
      window.removeEventListener(OFFLINE_SNAPSHOT_APPLIED_EVENT, handleSnapshotApplied as EventListener);
    };
  }, [activeBusiness]);

  const currency = activeBusiness?.currency || overview.receivables[0]?.currency || 'COP';
  const summaryCards = useMemo(() => buildSummaryCards(overview, currency), [currency, overview]);

  const openReminderModal = async (invoice: InvoiceReceivable) => {
    if (!activeBusiness) return;
    try {
      const payload = await invoicesService.getReminderShare(activeBusiness.id, invoice.invoice_id);
      setMessageModal({
        open: true,
        title: `Recordatorio ${invoice.invoice_number}`,
        description: 'Revisa el texto antes de reenviarlo por WhatsApp o copiarlo al portapapeles.',
        contactName: invoice.customer_name,
        phone: payload.phone || invoice.customer_phone,
        message: payload.message,
      });
    } catch (requestError: any) {
      if (requestError?.isOfflineRequestError || !requestError?.response) {
        setMessageModal({
          open: true,
          title: `Recordatorio ${invoice.invoice_number}`,
          description: 'Mensaje local listo para compartir mientras recuperas conexion.',
          contactName: invoice.customer_name,
          phone: invoice.customer_phone,
          message: buildInvoiceOfflineReminderMessage(invoice),
        });
        return;
      }
      toast.error(requestError?.response?.data?.error || 'No pudimos preparar el recordatorio');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setCustomerId('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search.trim().length > 0
    || status !== 'all'
    || customerId !== 'all'
    || startDate.length > 0
    || endDate.length > 0;

  const mobileFilterSummary = hasActiveFilters ? 'Con filtros activos' : 'Buscar, estado y fecha';
  const mobileSummaryLabel = `${overview.receivables.length} factura(s)`;
  const mobileReceivablesFilters = useMobileFilterDraft({
    value: { search, status, customerId, startDate, endDate },
    onApply: (nextValue) => {
      setSearch(nextValue.search);
      setStatus(nextValue.status);
      setCustomerId(nextValue.customerId);
      setStartDate(nextValue.startDate);
      setEndDate(nextValue.endDate);
    },
    createEmptyValue: () => ({
      search: '',
      status: 'all' as InvoiceReceivableFilterStatus,
      customerId: 'all',
      startDate: '',
      endDate: '',
    }),
  });

  const summaryContent = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-tour="invoice-receivables.summary">
      {summaryCards.map((card) => (
        <div
          key={card.label}
          className="app-stat-card p-5"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
            {card.label}
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
            {card.value}
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{card.helper}</div>
        </div>
      ))}
    </div>
  );

  const mobileUtilityBar = (
    <MobileUtilityBar>
      <MobileFilterDrawer summary={mobileFilterSummary} {...mobileReceivablesFilters.sheetProps}>
        <MobileFilterSection title="Filtrar cartera" description="Busca primero, luego acota estado, cliente y periodo de cobro.">
          <FilterBar
            search={(
              <FilterSearch
                value={mobileReceivablesFilters.draft.search}
                onChange={(value) => mobileReceivablesFilters.setDraft((current) => ({ ...current, search: value }))}
                placeholder="Buscar por factura, cliente, nota o metodo"
              />
            )}
            primary={[
              <FilterSelect
                key="status"
                value={mobileReceivablesFilters.draft.status}
                onChange={(value) => mobileReceivablesFilters.setDraft((current) => ({ ...current, status: value as InvoiceReceivableFilterStatus }))}
                options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                placeholder="Estado"
                sheetTitle="Seguimiento de cartera"
              />,
              <FilterSelect
                key="customer"
                value={mobileReceivablesFilters.draft.customerId}
                onChange={(value) => mobileReceivablesFilters.setDraft((current) => ({ ...current, customerId: value }))}
                options={[
                  { value: 'all', label: 'Todos los clientes' },
                  ...customers.map((customer) => ({ value: String(customer.id), label: customer.name })),
                ]}
                placeholder="Cliente"
                sheetTitle="Cliente"
              />,
            ]}
            secondary={(
              <FilterDateRange
                startValue={mobileReceivablesFilters.draft.startDate}
                endValue={mobileReceivablesFilters.draft.endDate}
                onStartChange={(value) => mobileReceivablesFilters.setDraft((current) => ({ ...current, startDate: value }))}
                onEndChange={(value) => mobileReceivablesFilters.setDraft((current) => ({ ...current, endDate: value }))}
              />
            )}
          />
        </MobileFilterSection>
      </MobileFilterDrawer>
      <MobileSummaryDrawer summary={mobileSummaryLabel}>
        {summaryContent}
      </MobileSummaryDrawer>
      <MobileHelpDisclosure summary="Como usar cartera">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Usa Filtros para reducir el listado sin cargar la pantalla principal. El periodo aqui si aporta valor porque cambia el corte de recaudo y vencimientos.
        </p>
      </MobileHelpDisclosure>
    </MobileUtilityBar>
  );

  return (
    <PageLayout data-tour="invoice-receivables.panel">
      <PageHeader
        title="Cartera de facturas"
        description="Sigue saldos, vencimientos y acciones de cobro desde una vista pensada para recaudo."
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={(
              <Link to="/invoices/new" className="block w-full">
                <Button className="w-full sm:w-auto">
                  <ReceiptText className="h-4 w-4" /> Nueva factura
                </Button>
              </Link>
            )}
            secondary={(
              <Link to="/invoices" className="block w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <FileSpreadsheet className="h-4 w-4" /> Facturas
                </Button>
              </Link>
            )}
          />
        )}
      />

      <PageFilters className="hidden lg:block" data-tour="invoice-receivables.filters">
        <FilterBar
          search={(
            <FilterSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por factura, cliente, nota o metodo"
            />
          )}
          primary={[
            <FilterSelect
              key="status"
              value={status}
              onChange={(value) => setStatus(value as InvoiceReceivableFilterStatus)}
              options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              placeholder="Estado"
              sheetTitle="Seguimiento de cartera"
            />,
            <FilterSelect
              key="customer"
              value={customerId}
              onChange={setCustomerId}
              options={[
                { value: 'all', label: 'Todos los clientes' },
                ...customers.map((customer) => ({ value: String(customer.id), label: customer.name })),
              ]}
              placeholder="Cliente"
              sheetTitle="Cliente"
            />,
          ]}
          secondary={(
            <>
              <FilterDateRange
                startValue={startDate}
                endValue={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
              <Button variant="secondary" onClick={handleClearFilters} className="w-full lg:w-auto">
                Limpiar
              </Button>
            </>
          )}
        />
      </PageFilters>

      <PageBody className="app-canvas">
        <MobileUnifiedPageShell utilityBar={mobileUtilityBar}>
          <div className="space-y-6">
            <div className="hidden lg:block">
              {summaryContent}
            </div>

            <div className="hidden rounded-[28px] border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-100 lg:block">
              Prioriza primero lo vencido y luego las facturas con abonos parciales. Desde esta vista puedes abrir la factura, preparar el recordatorio o saltar al estado de cuenta del cliente.
            </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && overview.receivables.length === 0 ? (
            <div className="app-surface rounded-3xl p-3">
              <TeachingEmptyState
                icon={ReceiptText}
                title="No encontramos cartera con esos filtros"
                description="Ajusta el rango, cambia el estado o vuelve al listado de facturas para emitir nuevos documentos."
                primaryActionLabel="Ver facturas"
                onPrimaryAction={() => navigate('/invoices')}
                secondaryActionLabel="Limpiar filtros"
                onSecondaryAction={handleClearFilters}
              />
            </div>
          ) : (
            <>
              <DataTableContainer className="hidden md:flex" data-tour="invoice-receivables.table">
                <table className="min-w-full text-sm">
                  <thead className="app-table-head text-left text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Factura</th>
                      <th className="px-4 py-3">Emision</th>
                      <th className="px-4 py-3">Vence</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Pagado</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                      <th className="px-4 py-3">Seguimiento</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                    {overview.receivables.map((invoice) => {
                      const tone = getInvoiceCollectionTone(invoice);
                      const syncMeta = getInvoiceSyncMeta(invoice);
                      return (
                        <tr key={invoice.invoice_id} className="app-table-row">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-950 dark:text-white">{invoice.customer_name || 'Cliente ocasional'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.customer_phone || 'Sin telefono'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-950 dark:text-white">{invoice.invoice_number}</div>
                              {!isOfflineProductMode() && syncMeta && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${syncMeta.className}`}>
                                  {syncMeta.label}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.payment_method || 'Metodo por definir'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.issue_date)}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.due_date)}</td>
                          <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatInvoiceMoney(invoice.total, invoice.currency)}</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatInvoiceMoney(invoice.paid_amount, invoice.currency)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${tone.textClassName}`}>{formatInvoiceMoney(invoice.balance_due, invoice.currency)}</td>
                          <td className="px-4 py-3">
                            <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badgeClassName}`}>
                              {getInvoiceCollectionLabel(invoice)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => openReminderModal(invoice)}>
                                <BellRing className="h-4 w-4" /> Recordar
                              </Button>
                              {invoice.customer_id ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => navigate(`/invoices/customers/${invoice.customer_id}/statement`)}
                                >
                                  Estado
                                </Button>
                              ) : null}
                              <Link to={`/invoices/${invoice.invoice_id}`}>
                                <Button variant="secondary" size="sm">
                                  <Eye className="h-4 w-4" /> Ver
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTableContainer>

              <div className="grid gap-4 md:hidden" data-tour="invoice-receivables.table">
                {overview.receivables.map((invoice) => {
                  const tone = getInvoiceCollectionTone(invoice);
                  const syncMeta = getInvoiceSyncMeta(invoice);
                  return (
                    <div
                      key={invoice.invoice_id}
                      className="app-surface rounded-[28px] p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-gray-950 dark:text-white">{invoice.customer_name || 'Cliente ocasional'}</div>
                            {!isOfflineProductMode() && syncMeta && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${syncMeta.className}`}>
                                {syncMeta.label}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{invoice.invoice_number}</div>
                        </div>
                        <StatusBadge status={invoice.status} />
                      </div>

                      <div className="app-muted-panel mt-4 grid grid-cols-2 gap-3 rounded-2xl p-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Emision</div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.issue_date)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Vence</div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.due_date)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Pagado</div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{formatInvoiceMoney(invoice.paid_amount, invoice.currency)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Saldo</div>
                          <div className={`mt-1 text-sm font-semibold ${tone.textClassName}`}>{formatInvoiceMoney(invoice.balance_due, invoice.currency)}</div>
                        </div>
                      </div>

                      <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badgeClassName}`}>
                        {getInvoiceCollectionLabel(invoice)}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <Button variant="secondary" onClick={() => openReminderModal(invoice)} className="w-full">
                          <BellRing className="h-4 w-4" /> Recordar
                        </Button>
                        {invoice.customer_id ? (
                          <Button
                            variant="secondary"
                            onClick={() => navigate(`/invoices/customers/${invoice.customer_id}/statement`)}
                            className="w-full"
                          >
                            Estado de cuenta
                          </Button>
                        ) : null}
                        <Link to={`/invoices/${invoice.invoice_id}`} className="block">
                          <Button variant="secondary" className="w-full">
                            Ver factura <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </MobileUnifiedPageShell>
      </PageBody>

      <InvoiceMessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal((current) => ({ ...current, open: false }))}
        title={messageModal.title}
        description={messageModal.description}
        contactName={messageModal.contactName}
        initialPhone={messageModal.phone}
        initialMessage={messageModal.message}
      />
    </PageLayout>
  );
};
