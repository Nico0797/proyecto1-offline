import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  FileSpreadsheet,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { FilterBar, FilterPeriod, FilterSearch, FilterSelect } from '../components/ui/FilterBar';
import {
  CompactActionGroup,
  ContentSection,
  DataTableContainer,
  PageBody,
  PageHeader,
  PageLayout,
  PageNotice,
  PageStack,
  SectionStack,
  SummarySection,
  ToolbarSection,
} from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSelectField,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import {
  getInvoiceEditability,
  getInvoiceSyncMeta,
  INVOICE_STATUS_META,
  formatInvoiceDate,
  formatInvoiceMoney,
} from '../components/Invoices/invoiceHelpers';
import { useBusinessStore } from '../store/businessStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { Invoice, InvoiceStatus } from '../types';

const STATUS_OPTIONS: Array<{ value: InvoiceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'draft', label: 'Borradores' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'partial', label: 'Parciales' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const meta = INVOICE_STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const buildSummaryCards = (invoices: Invoice[], currency: string) => {
  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.total += invoice.total;
      acc.pending += invoice.outstanding_balance;
      if (invoice.status === 'paid') acc.paid += 1;
      if (invoice.status === 'overdue') acc.overdue += 1;
      if (invoice.status === 'draft') acc.draft += 1;
      return acc;
    },
    { total: 0, pending: 0, paid: 0, overdue: 0, draft: 0 }
  );

  return [
    {
      label: 'Facturado',
      value: formatInvoiceMoney(totals.total, currency),
      helper: `${invoices.length} documento(s)`,
    },
    {
      label: 'Pendiente',
      value: formatInvoiceMoney(totals.pending, currency),
      helper: `${totals.overdue} vencida(s)`,
    },
    {
      label: 'Pagadas',
      value: `${totals.paid}`,
      helper: 'Cerradas por completo',
    },
    {
      label: 'Borradores',
      value: `${totals.draft}`,
      helper: 'Listas por enviar',
    },
  ];
};

export const Invoices = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { invoices, loading, error, fetchInvoices } = useInvoiceStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('invoices'));

  useEffect(() => {
    if (activeBusiness) {
      fetchInvoices(activeBusiness.id);
    }
  }, [activeBusiness, fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesStatus = status === 'all' ? true : invoice.status === status;
      const matchesSearch = !needle
        ? true
        : [
            invoice.invoice_number,
            invoice.customer_name || '',
            invoice.notes || '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(needle);
      let matchesDate = true;
      if (dateRange.start) {
        matchesDate = matchesDate && new Date(invoice.issue_date) >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(invoice.issue_date) <= end;
      }
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [dateRange.end, dateRange.start, invoices, search, status]);

  const currency = activeBusiness?.currency || filteredInvoices[0]?.currency || 'COP';
  const summaryCards = useMemo(() => buildSummaryCards(filteredInvoices, currency), [filteredInvoices, currency]);
  const hasActiveFilters = search.trim().length > 0 || status !== 'all' || dateRange.preset !== 'month';
  const mobileFilterSummary = hasActiveFilters ? 'Con filtros activos' : 'Buscar y filtrar';
  const mobileSummaryLabel = `${filteredInvoices.length} factura(s)`;
  const mobileInvoiceFilters = useMobileFilterDraft({
    value: { search, status, dateRange },
    onApply: (nextValue) => {
      setSearch(nextValue.search);
      setStatus(nextValue.status);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      search: '',
      status: 'all' as InvoiceStatus | 'all',
      dateRange: getPeriodPreference('invoices'),
    }),
  });

  const invoiceSummaryContent = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-tour="invoices.summary">
      {summaryCards.map((card) => (
        <div
          key={card.label}
          className="app-stat-card p-5 sm:p-6"
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

  const legacyInvoiceToolbarContent = (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="min-w-0 flex-1">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por numero, cliente o nota..."
          icon={Search}
        />
      </div>
      <div className="w-full lg:w-64">
        <MobileSelectField
          value={status}
          onChange={(value) => setStatus(value as InvoiceStatus | 'all')}
          options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          placeholder="Estado"
          sheetTitle="Estado de facturas"
          selectClassName="w-full"
        />
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {loading ? 'Cargando facturas...' : `${filteredInvoices.length} resultado(s)`}
      </div>
    </div>
  );

  const invoiceToolbarContent = (
    <FilterBar
      search={(
        <FilterSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por numero, cliente o nota"
        />
      )}
      primary={(
        <FilterSelect
          value={status}
          onChange={(value) => setStatus(value as InvoiceStatus | 'all')}
          options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          placeholder="Estado"
          sheetTitle="Estado de facturas"
        />
      )}
      period={(
        <FilterPeriod moduleId="invoices" value={dateRange} onChange={setDateRange} />
      )}
      actions={(
        <div className="flex min-h-11 items-center text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Cargando facturas...' : `${filteredInvoices.length} resultado(s)`}
        </div>
      )}
    />
  );

  const mobileInvoiceToolbarContent = (
    <FilterBar
      search={(
        <FilterSearch
          value={mobileInvoiceFilters.draft.search}
          onChange={(value) => mobileInvoiceFilters.setDraft((current) => ({ ...current, search: value }))}
          placeholder="Buscar por numero, cliente o nota"
        />
      )}
      primary={(
        <FilterSelect
          value={mobileInvoiceFilters.draft.status}
          onChange={(value) => mobileInvoiceFilters.setDraft((current) => ({ ...current, status: value as InvoiceStatus | 'all' }))}
          options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          placeholder="Estado"
          sheetTitle="Estado de facturas"
        />
      )}
      period={(
        <FilterPeriod
          moduleId="invoices"
          value={mobileInvoiceFilters.draft.dateRange}
          onChange={(value) => mobileInvoiceFilters.setDraft((current) => ({ ...current, dateRange: value }))}
        />
      )}
    />
  );

  void legacyInvoiceToolbarContent;

  return (
    <PageLayout data-tour="invoices.panel">
      <PageHeader
        title="Facturas digitales"
        description="Crea, comparte y sigue facturas profesionales con estados claros, PDF y experiencia responsive."
        mobileFab={{
          label: '+Factura',
          icon: Plus,
          onClick: () => navigate('/invoices/new'),
        }}
        action={(
          <CompactActionGroup
            collapseLabel="Atajos"
            primary={(
              <Link to="/invoices/new" className="block w-full">
                <Button className="w-full sm:w-auto" data-tour="invoices.primaryAction">
                  <Plus className="h-4 w-4" /> Nueva factura
                </Button>
              </Link>
            )}
            secondary={[
              <Link key="settings" to="/invoices/settings" className="block w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto" data-tour="invoices.settings">
                  <Settings2 className="h-4 w-4" /> Ajustes
                </Button>
              </Link>,
              <Link key="receivables" to="/invoices/receivables" className="block w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto" data-tour="invoices.receivables">
                  <FileSpreadsheet className="h-4 w-4" /> Cartera
                </Button>
              </Link>,
              ...(!isOfflineProductMode()
                ? [<Link key="sync" to="/invoices/sync" className="block w-full sm:w-auto">
                    <Button variant="secondary" className="w-full sm:w-auto" data-tour="invoices.sync">
                      <Settings2 className="h-4 w-4" /> Sync
                    </Button>
                  </Link>]
                : []),
            ]}
          />
        )}
      />

      <PageBody className="app-canvas">
        <PageStack>
          <div className="hidden lg:block">
            <PageStack>
              <PageNotice
                description="Empieza por la gestión operativa. El resumen queda más abajo como referencia rápida para no tapar la lista principal."
                dismissible
              />

              <ToolbarSection data-tour="invoices.filters">
                {invoiceToolbarContent}
              </ToolbarSection>
            </PageStack>
          </div>

          <MobileUnifiedPageShell
            utilityBar={(
              <MobileUtilityBar>
                <MobileFilterDrawer summary={mobileFilterSummary} {...mobileInvoiceFilters.sheetProps}>
                  {mobileInvoiceToolbarContent}
                </MobileFilterDrawer>
                <MobileSummaryDrawer summary={mobileSummaryLabel}>
                  {invoiceSummaryContent}
                </MobileSummaryDrawer>
                <MobileHelpDisclosure summary="Cómo usar facturas">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    La lista queda primero para gestionar documentos. El resumen y los filtros avanzados viven en accesos compactos para no empujar el contenido.
                  </p>
                </MobileHelpDisclosure>
              </MobileUtilityBar>
            )}
          >
            <SectionStack>
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                  {error}
                </div>
              )}

              <ContentSection>
                {filteredInvoices.length === 0 && !loading ? (
                  <div className="app-surface rounded-3xl p-3">
                    <TeachingEmptyState
                      icon={FileSpreadsheet}
                      title={hasActiveFilters ? 'No encontramos facturas con esos filtros' : 'Tu modulo de facturas esta listo'}
                      description={hasActiveFilters
                        ? 'Prueba otra busqueda o limpia los filtros para revisar todo el historial.'
                        : 'Empieza con una factura en borrador, personaliza el documento y compartelo cuando este listo.'}
                      primaryActionLabel="Crear factura"
                      onPrimaryAction={() => navigate('/invoices/new')}
                      secondaryActionLabel={hasActiveFilters ? 'Limpiar filtros' : 'Configurar factura'}
                      onSecondaryAction={() => {
                        if (hasActiveFilters) {
                          setSearch('');
                          setStatus('all');
                          setDateRange(getPeriodPreference('invoices'));
                          return;
                        }
                        navigate('/invoices/settings');
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <DataTableContainer className="hidden md:flex" data-tour="invoices.table">
                  <table className="min-w-full text-sm">
                    <thead className="app-table-head text-left text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                      <tr>
                        <th className="px-4 py-3">Factura</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Emision</th>
                        <th className="px-4 py-3">Vence</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="app-table-row">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</div>
                              {!isOfflineProductMode() && getInvoiceSyncMeta(invoice) && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getInvoiceSyncMeta(invoice)?.className}`}>
                                  {getInvoiceSyncMeta(invoice)?.label}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {getInvoiceEditability(invoice).canEdit
                                ? (invoice.payment_method || 'Metodo por definir')
                                : 'Documento cerrado para edicion'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{invoice.customer_name || 'Cliente ocasional'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.issue_date)}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.due_date)}</td>
                          <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                            {formatInvoiceMoney(invoice.outstanding_balance, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {formatInvoiceMoney(invoice.total, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/invoices/${invoice.id}`}>
                              <Button variant="secondary" size="sm">
                                <Eye className="h-4 w-4" /> Ver
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    </DataTableContainer>

                    <div className="grid gap-4 md:hidden" data-tour="invoices.table">
                  {filteredInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="app-surface rounded-[28px] p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:hover:border-blue-900/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</div>
                            {!isOfflineProductMode() && getInvoiceSyncMeta(invoice) && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getInvoiceSyncMeta(invoice)?.className}`}>
                                {getInvoiceSyncMeta(invoice)?.label}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{invoice.customer_name || 'Cliente ocasional'}</div>
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
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Saldo</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {formatInvoiceMoney(invoice.outstanding_balance, invoice.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Total</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {formatInvoiceMoney(invoice.total, invoice.currency)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-blue-600 dark:text-blue-400">
                        <span>
                          {getInvoiceEditability(invoice).canEdit
                            ? (invoice.payment_method || 'Abrir detalle y acciones')
                            : 'Detalle, pagos y soporte'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          Ver factura <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  ))}
                    </div>
                  </>
                )}
              </ContentSection>

              <div className="hidden lg:block">
                <SummarySection title="Resumen rápido" description="Consulta el estado agregado sin quitarle prioridad al listado operativo.">
                  {invoiceSummaryContent}
                </SummarySection>
              </div>
            </SectionStack>
          </MobileUnifiedPageShell>
        </PageStack>
      </PageBody>
    </PageLayout>
  );
};
