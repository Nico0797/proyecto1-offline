import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CheckCircle2, Download, Eye, FileText, Pencil, Plus, Printer, SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { QuoteFormModal } from '../components/Quotes/QuoteFormModal';
import { useBusinessStore } from '../store/businessStore';
import { useQuoteStore } from '../store/quoteStore';
import { Quote, QuoteStatus } from '../types';
import { formatCOP } from '../components/Sales/helpers';
import { useAccess } from '../hooks/useAccess';
import { quotesService } from '../services/quotesService';
import { downloadFile } from '../utils/downloadHelper';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { PageBody, PageHeader, PageHeaderActionButton, PageLayout, PageNotice, PageStack, PageToolbarCard } from '../components/Layout/PageLayout';
import { FilterBar, FilterPeriod, FilterSearch, FilterSelect } from '../components/ui/FilterBar';
import {
  MobileFilterDrawer,
  MobileSelectField,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  converted: 'Convertida',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const EDITABLE_STATUS_OPTIONS: QuoteStatus[] = ['draft', 'sent', 'approved', 'rejected', 'expired'];

export const Quotes = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const {
    quotes,
    selectedQuote,
    loading,
    saving,
    error,
    fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    updateQuoteStatus,
    convertQuoteToSale,
    setSelectedQuote,
  } = useQuoteStore();
  const { hasPermission, hasModule } = useAccess();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('quotes'));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailStatus, setDetailStatus] = useState<QuoteStatus>('draft');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'paid' | 'credit' | 'partial'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [convertNote, setConvertNote] = useState('');

  useEffect(() => {
    if (activeBusiness) {
      fetchQuotes(activeBusiness.id);
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (!selectedQuote) return;
    setDetailStatus(selectedQuote.status);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setPaymentType('paid');
    setPaymentMethod('cash');
    setAmountPaid(Number(selectedQuote.total || 0));
    setConvertNote('');
  }, [selectedQuote]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const matchesStatus = statusFilter === 'all' ? true : quote.status === statusFilter;
      const needle = searchTerm.trim().toLowerCase();
      const matchesSearch = !needle
        ? true
        : [quote.quote_code, quote.customer_name || '', quote.notes || '']
            .join(' ')
            .toLowerCase()
            .includes(needle);
      let matchesDate = true;
      if (dateRange.start) {
        matchesDate = matchesDate && new Date(quote.issue_date) >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(quote.issue_date) <= end;
      }
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [dateRange.end, dateRange.start, quotes, searchTerm, statusFilter]);

  const canCreate = hasPermission('quotes.create');
  const canUpdate = hasPermission('quotes.update');
  const canConvert = hasPermission('quotes.convert');
  const canDelete = hasPermission('quotes.delete');
  const canUseReceivables = hasModule('accounts_receivable');
  const hasActiveFilters = Boolean(searchTerm.trim() || statusFilter !== 'all' || dateRange.preset !== 'month');

  const quotesFilterSummary = hasActiveFilters
    ? statusFilter === 'all'
      ? 'Búsqueda activa'
      : STATUS_LABELS[statusFilter]
    : 'Buscar y estado';
  const mobileQuoteFilters = useMobileFilterDraft({
    value: { searchTerm, statusFilter, dateRange },
    onApply: (nextValue) => {
      setSearchTerm(nextValue.searchTerm);
      setStatusFilter(nextValue.statusFilter);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      searchTerm: '',
      statusFilter: 'all' as QuoteStatus | 'all',
      dateRange: getPeriodPreference('quotes'),
    }),
  });

  const errorNotice = error ? (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
      {error}
    </div>
  ) : null;

  const legacyQuotesFilterContent = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por código, cliente o nota..."
      />
      <MobileSelectField
        value={statusFilter}
        onChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
        options={[
          { value: 'all', label: 'Todos los estados' },
          ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
        ]}
        placeholder="Estado"
        sheetTitle="Estado de cotización"
      />
      <div className="flex min-h-11 items-center text-sm text-gray-500 dark:text-gray-400">
        {loading ? 'Cargando cotizaciones...' : `${filteredQuotes.length} cotización(es)`}
      </div>
      {hasActiveFilters ? (
        <div className="md:col-span-3">
          <Button type="button" variant="secondary" onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }} className="w-full md:w-auto">
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );

  const quotesFilterContent = (
    <FilterBar
      search={(
        <FilterSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por codigo, cliente o nota"
        />
      )}
      primary={(
        <FilterSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
          options={[
            { value: 'all', label: 'Todos los estados' },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          placeholder="Estado"
          sheetTitle="Estado de cotizacion"
        />
      )}
      period={(
        <FilterPeriod moduleId="quotes" value={dateRange} onChange={setDateRange} />
      )}
      actions={[
        <div key="count" className="flex min-h-11 items-center text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Cargando cotizaciones...' : `${filteredQuotes.length} cotizacion(es)`}
        </div>,
        ...(hasActiveFilters ? [(
          <Button
            key="clear"
            type="button"
            variant="secondary"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateRange(getPeriodPreference('quotes'));
            }}
            className="w-full lg:w-auto"
          >
            Limpiar filtros
          </Button>
        )] : []),
      ]}
    />
  );

  const mobileQuotesFilterContent = (
    <FilterBar
      search={(
        <FilterSearch
          value={mobileQuoteFilters.draft.searchTerm}
          onChange={(value) => mobileQuoteFilters.setDraft((current) => ({ ...current, searchTerm: value }))}
          placeholder="Buscar por codigo, cliente o nota"
        />
      )}
      primary={(
        <FilterSelect
          value={mobileQuoteFilters.draft.statusFilter}
          onChange={(value) => mobileQuoteFilters.setDraft((current) => ({ ...current, statusFilter: value as QuoteStatus | 'all' }))}
          options={[
            { value: 'all', label: 'Todos los estados' },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          placeholder="Estado"
          sheetTitle="Estado de cotizacion"
        />
      )}
      period={(
        <FilterPeriod
          moduleId="quotes"
          value={mobileQuoteFilters.draft.dateRange}
          onChange={(value) => mobileQuoteFilters.setDraft((current) => ({ ...current, dateRange: value }))}
        />
      )}
    />
  );

  void legacyQuotesFilterContent;

  const openCreate = () => {
    setEditingQuote(null);
    setIsFormOpen(true);
  };

  const openEdit = (quote: Quote) => {
    if (quote.status === 'converted' || quote.converted_sale_id) {
      toast.error('No puedes editar una cotización convertida');
      return;
    }
    setEditingQuote(quote);
    setIsFormOpen(true);
  };

  const openDetail = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedQuote(null);
  };

  const handleSaveQuote = async (payload: any) => {
    if (!activeBusiness) return;
    try {
      if (editingQuote) {
        await updateQuote(activeBusiness.id, editingQuote.id, payload);
        toast.success('Cotización actualizada correctamente');
      } else {
        await createQuote(activeBusiness.id, payload);
        toast.success('Cotización creada correctamente');
      }
      setIsFormOpen(false);
      setEditingQuote(null);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'No fue posible guardar la cotización';
      toast.error(message);
    }
  };

  const handleStatusUpdate = async () => {
    if (!activeBusiness || !selectedQuote) return;
    if (selectedQuote.status === 'converted' || selectedQuote.converted_sale_id) {
      toast.error('No puedes cambiar el estado de una cotización convertida');
      return;
    }
    try {
      const updated = await updateQuoteStatus(activeBusiness.id, selectedQuote.id, detailStatus);
      setSelectedQuote(updated);
      toast.success('Estado de la cotización actualizado');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'No fue posible actualizar el estado';
      toast.error(message);
    }
  };

  const handleConvert = async () => {
    if (!activeBusiness || !selectedQuote) return;
    if (selectedQuote.status === 'converted' || selectedQuote.converted_sale_id) {
      toast.error('La cotización ya fue convertida previamente');
      return;
    }
    if (!saleDate) {
      toast.error('La fecha de venta es requerida');
      return;
    }
    if (paymentType !== 'paid' && !canUseReceivables) {
      toast.error('No puedes convertir esta cotización a crédito o pago parcial porque el módulo accounts_receivable está deshabilitado para este negocio');
      return;
    }
    try {
      const payload = {
        sale_date: saleDate,
        payment_method: paymentMethod,
        paid: paymentType === 'paid',
        amount_paid: paymentType === 'paid' ? Number(selectedQuote.total || 0) : paymentType === 'credit' ? 0 : amountPaid,
        note: convertNote || undefined,
      };
      const result = await convertQuoteToSale(activeBusiness.id, selectedQuote.id, payload);
      setSelectedQuote(result.quote);
      toast.success(`Cotización convertida a venta #${result.sale.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'No fue posible convertir la cotización';
      toast.error(message);
    }
  };

  const handleDelete = async (quote: Quote) => {
    if (!activeBusiness) return;
    if (quote.status === 'converted' || quote.converted_sale_id) {
      toast.error('No puedes eliminar una cotización convertida porque rompería la trazabilidad histórica con su venta');
      return;
    }
    if (!window.confirm(`¿Eliminar la cotización ${quote.quote_code}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteQuote(activeBusiness.id, quote.id);
      if (selectedQuote?.id === quote.id) {
        closeDetail();
      }
      toast.success('Cotización eliminada correctamente');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'No fue posible eliminar la cotización';
      toast.error(message);
    }
  };

  const openPrintableQuote = async (quote: Quote, autoPrint = false) => {
    if (!activeBusiness) return;
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      toast.error('Tu navegador bloqueó la apertura de la vista imprimible');
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write('<html><head><title>Cargando cotización...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Cargando cotización...</body></html>');
    previewWindow.document.close();

    try {
      const html = await quotesService.getPrintableHtml(activeBusiness.id, quote.id);
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
      previewWindow.focus();

      if (autoPrint) {
        window.setTimeout(() => {
          previewWindow.focus();
          previewWindow.print();
        }, 250);
      }
    } catch (err: any) {
      previewWindow.close();
      const message = err?.response?.data?.error || 'No fue posible abrir la cotización imprimible';
      toast.error(message);
    }
  };

  const handleDownloadPdf = async (quote: Quote) => {
    if (!activeBusiness) return;
    const token = localStorage.getItem('token') || undefined;
    await downloadFile(
      quotesService.getPdfDownloadPath(activeBusiness.id, quote.id),
      { filename: `cotizacion_${quote.quote_code}.pdf` },
      token
    );
  };

  const renderStatusBadge = (status: QuoteStatus) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );

  return (
    <PageLayout data-tour="quotes.panel">
      <PageHeader
        title="Cotizaciones"
        description="Gestiona cotizaciones separadas de ventas y conviértelas explícitamente cuando corresponda."
        action={canCreate ? (
          <PageHeaderActionButton
            onClick={openCreate}
            icon={Plus}
            label="Nueva cotización"
            mobileLabel="Cotizar"
            data-tour="quotes.primaryAction"
          />
        ) : undefined}
      />

      <PageBody className="bg-gray-50 dark:bg-gray-950/40">
        <PageStack>
          <PageNotice
            description="Usa cotizaciones para proponer antes de vender y convierte a venta sólo cuando el cliente confirme."
            dismissible
          />
          <div className="lg:hidden">
            <MobileUnifiedPageShell
              utilityBar={(
                <MobileUtilityBar>
                  <MobileFilterDrawer summary={quotesFilterSummary} {...mobileQuoteFilters.sheetProps}>
                    <div data-tour="quotes.filters">
                      {mobileQuotesFilterContent}
                    </div>
                  </MobileFilterDrawer>
                </MobileUtilityBar>
              )}
            >
              {errorNotice}
            </MobileUnifiedPageShell>
          </div>

          <div className="hidden lg:block">
            <PageToolbarCard>
              <div data-tour="quotes.filters">
                {quotesFilterContent}
              </div>
              {errorNotice ? <div className="mt-3">{errorNotice}</div> : null}
            </PageToolbarCard>
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden" data-tour="quotes.table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Código</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Emisión</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredQuotes.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6">
                        <TeachingEmptyState
                          compact
                          icon={FileText}
                          title={searchTerm || statusFilter !== 'all' ? 'No hay cotizaciones con este filtro' : 'Aún no has creado cotizaciones'}
                          description={searchTerm || statusFilter !== 'all'
                            ? 'Prueba con otro estado o limpia la búsqueda para encontrar propuestas existentes.'
                            : 'Las cotizaciones te ayudan a proponer antes de vender y a convertir la oportunidad en venta cuando el cliente confirme.'}
                          primaryActionLabel={canCreate ? 'Nueva cotización' : undefined}
                          onPrimaryAction={canCreate ? openCreate : undefined}
                          secondaryActionLabel={searchTerm || statusFilter !== 'all' ? 'Limpiar filtros' : undefined}
                          onSecondaryAction={searchTerm || statusFilter !== 'all' ? (() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }) : undefined}
                        />
                      </td>
                    </tr>
                  )}
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{quote.quote_code}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{quote.customer_name || 'Sin cliente'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{quote.issue_date}</td>
                      <td className="px-4 py-3">{renderStatusBadge(quote.status)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCOP(quote.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => openDetail(quote)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canUpdate && quote.status !== 'converted' && !quote.converted_sale_id && (
                            <Button variant="secondary" onClick={() => openEdit(quote)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && quote.status !== 'converted' && !quote.converted_sale_id && (
                            <Button variant="secondary" onClick={() => handleDelete(quote)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </PageStack>
      </PageBody>

      <QuoteFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQuote(null);
        }}
        onSubmit={handleSaveQuote}
        quote={editingQuote}
        isSaving={saving}
      />
      <Modal
        isOpen={isDetailOpen && !!selectedQuote}
        onClose={closeDetail}
        title={selectedQuote ? `Cotización ${selectedQuote.quote_code}` : 'Detalle de cotización'}
        className="max-w-5xl h-[90vh]"
      >
        {selectedQuote && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Estado</div>
                <div className="mt-2">{renderStatusBadge(selectedQuote.status)}</div>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Cliente</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedQuote.customer_name || 'Sin cliente'}</div>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Emisión</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedQuote.issue_date}</div>
              </div>
              <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Total</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{formatCOP(selectedQuote.total)}</div>
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Salida comercial</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Abre una vista profesional, imprime o descarga la cotización en PDF.</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => openPrintableQuote(selectedQuote, false)}>
                    <SquareArrowOutUpRight className="w-4 h-4 mr-2" /> Ver cotización
                  </Button>
                  <Button variant="secondary" onClick={() => openPrintableQuote(selectedQuote, true)}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir / Guardar PDF
                  </Button>
                  <Button variant="secondary" onClick={() => handleDownloadPdf(selectedQuote)}>
                    <Download className="w-4 h-4 mr-2" /> Descargar PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                <FileText className="w-4 h-4" /> Items cotizados
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Descripción</th>
                      <th className="px-4 py-3 text-left font-medium">Producto</th>
                      <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                      <th className="px-4 py-3 text-right font-medium">Unitario</th>
                      <th className="px-4 py-3 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selectedQuote.items.map((item, index) => (
                      <tr key={`${item.id || index}-${index}`}>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{item.description}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.product_name || 'Concepto libre'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCOP(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCOP(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Resumen</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>{formatCOP(selectedQuote.subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Descuento</span><span>{formatCOP(selectedQuote.discount)}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900 dark:border-gray-700 dark:text-white"><span>Total</span><span>{formatCOP(selectedQuote.total)}</span></div>
                </div>
                {selectedQuote.expiry_date && (
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Vence: {selectedQuote.expiry_date}</div>
                )}
              </div>
              <div className="space-y-3 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Notas</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{selectedQuote.notes || 'Sin notas'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Términos</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{selectedQuote.terms || 'Sin términos'}</div>
                </div>
              </div>
            </div>

            {canUpdate && selectedQuote.status !== 'converted' && !selectedQuote.converted_sale_id && (
              <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Cambiar estado</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">La conversión a venta marca automáticamente la cotización como convertida.</div>
                  </div>
                  <div className="flex w-full gap-3 md:w-auto">
                    <select
                      className="app-select flex-1 md:w-56"
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value as QuoteStatus)}
                    >
                      {EDITABLE_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>{STATUS_LABELS[statusOption]}</option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={handleStatusUpdate} isLoading={saving}>Guardar estado</Button>
                  </div>
                </div>
              </div>
            )}

            {selectedQuote.status !== 'converted' && !selectedQuote.converted_sale_id && canConvert && (
              <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                <div>
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">Convertir a venta</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">La cotización solo entra al flujo comercial cuando conviertes explícitamente a venta.</div>
                  {!canUseReceivables && (
                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Con `accounts_receivable` deshabilitado, solo puedes convertir esta cotización como venta de contado.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-blue-700 dark:text-blue-300">Fecha de venta</label>
                    <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-blue-700 dark:text-blue-300">Tipo de pago</label>
                    <select
                      className="app-select"
                      value={paymentType}
                      onChange={(e) => {
                        const value = e.target.value as 'paid' | 'credit' | 'partial';
                        setPaymentType(value);
                        if (value === 'paid') setAmountPaid(Number(selectedQuote.total || 0));
                        if (value === 'credit') setAmountPaid(0);
                        if (value === 'partial') setAmountPaid(Number(selectedQuote.total || 0) / 2);
                      }}
                    >
                      <option value="paid">Contado</option>
                      <option value="credit" disabled={!canUseReceivables}>Crédito</option>
                      <option value="partial" disabled={!canUseReceivables}>Pago parcial</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-blue-700 dark:text-blue-300">Método</label>
                    <select className="app-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="card">Tarjeta</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-blue-700 dark:text-blue-300">Monto pagado</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentType === 'credit' ? 0 : amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      disabled={paymentType === 'credit'}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-blue-700 dark:text-blue-300">Nota adicional para la venta</label>
                  <textarea
                    className="min-h-[110px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                    value={convertNote}
                    onChange={(e) => setConvertNote(e.target.value)}
                    placeholder="Opcional: contexto extra al convertir esta cotización"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Venta resultante: <span className="font-semibold">{paymentType === 'paid' ? 'pagada' : paymentType === 'credit' ? 'a crédito' : 'con pago parcial'}</span>
                  </div>
                  <Button onClick={handleConvert} isLoading={saving}>
                    <ArrowRightLeft className="w-4 h-4 mr-2" /> Convertir a venta
                  </Button>
                </div>
              </div>
            )}

            {(selectedQuote.status === 'converted' || !!selectedQuote.converted_sale_id) && (
              <div className="flex flex-col gap-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-200">
                    <CheckCircle2 className="w-5 h-5" /> Cotización convertida
                  </div>
                  <div className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Venta creada: #{selectedQuote.converted_sale_id || '-'}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => navigate('/sales')}>
                  Ir a ventas
                </Button>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-3 dark:border-gray-700 sm:flex-row">
              {canUpdate && selectedQuote.status !== 'converted' && !selectedQuote.converted_sale_id && (
                <Button variant="secondary" onClick={() => openEdit(selectedQuote)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar cotización
                </Button>
              )}
              {canDelete && selectedQuote.status !== 'converted' && !selectedQuote.converted_sale_id && (
                <Button variant="secondary" onClick={() => handleDelete(selectedQuote)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </Button>
              )}
              <Button variant="secondary" onClick={closeDetail}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};
