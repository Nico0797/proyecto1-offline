import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  Download,
  Eye,
  FileText,
  MessageCircleMore,
  SearchCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InvoiceMessageModal } from '../components/Invoices/InvoiceMessageModal';
import {
  buildInvoiceOfflineReminderMessage,
  buildInvoiceStatementOfflineMessage,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceCollectionLabel,
  getInvoiceCollectionTone,
  getInvoicePaymentEventLabel,
  getInvoicePaymentEventTone,
  getInvoicePaymentSyncMeta,
  getInvoiceSyncMeta,
  INVOICE_STATUS_META,
} from '../components/Invoices/invoiceHelpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  CompactActionGroup,
  DataTableContainer,
  PageBody,
  PageFilters,
  PageHeader,
  PageLayout,
} from '../components/Layout/PageLayout';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { InvoiceCustomerStatement as InvoiceCustomerStatementType, InvoiceReceivable } from '../types';
import { invoicesService } from '../services/invoicesService';
import { OFFLINE_SNAPSHOT_APPLIED_EVENT, offlineSyncService } from '../services/offlineSyncService';
import { useBusinessStore } from '../store/businessStore';

const openStatementPrintPreview = async (
  businessId: number,
  customerId: number,
  filters: { start_date?: string; end_date?: string }
) => {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('Tu navegador bloqueo la apertura de la vista imprimible');
  }

  previewWindow.document.open();
  previewWindow.document.write('<html><head><title>Cargando estado de cuenta...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Cargando estado de cuenta...</body></html>');
  previewWindow.document.close();

  const html = await invoicesService.getCustomerStatementPrintableHtml(businessId, customerId, filters);
  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  previewWindow.focus();
};

const StatusBadge = ({ status }: { status: InvoiceReceivable['status'] }) => {
  const meta = INVOICE_STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
};

export const InvoiceCustomerStatement = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const { activeBusiness } = useBusinessStore();

  const [statement, setStatement] = useState<InvoiceCustomerStatementType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!activeBusiness || !customerId) return;
    let active = true;
    setLoading(true);
    setError(null);

    invoicesService.getCustomerStatement(activeBusiness.id, Number(customerId), {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
      .then((response) => {
        if (!active) return;
        setStatement(response);
      })
      .catch((requestError: any) => {
        if (!active) return;
        if (requestError?.isOfflineRequestError || !requestError?.response) {
          offlineSyncService.buildInvoiceCustomerStatementFromLocal(
            activeBusiness.id,
            Number(customerId),
            {
              start_date: startDate || undefined,
              end_date: endDate || undefined,
            }
          )
            .then((response) => {
              if (!active) return;
              setStatement(response);
              setError(null);
            })
            .catch((offlineError: any) => {
              if (!active) return;
              setError(offlineError?.message || 'No fue posible cargar el estado de cuenta');
            })
            .finally(() => {
              if (active) setLoading(false);
            });
          return;
        }
        setError(requestError?.response?.data?.error || 'No fue posible cargar el estado de cuenta');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeBusiness, customerId, endDate, refreshNonce, startDate]);

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

  const currency = activeBusiness?.currency || statement?.invoices[0]?.currency || 'COP';
  const summaryCards = useMemo(() => {
    const summary = statement?.summary;
    return [
      {
        label: 'Facturado',
        value: formatInvoiceMoney(summary?.total_invoiced || 0, currency),
        helper: `${summary?.invoice_count || 0} factura(s) emitida(s)`,
      },
      {
        label: 'Pagado',
        value: formatInvoiceMoney(summary?.total_paid || 0, currency),
        helper: `${summary?.payment_count || 0} pago(s) aplicados`,
      },
      {
        label: 'Saldo pendiente',
        value: formatInvoiceMoney(summary?.balance_due || 0, currency),
        helper: `${summary?.open_count || 0} factura(s) abierta(s)`,
      },
      {
        label: 'Saldo vencido',
        value: formatInvoiceMoney(summary?.overdue_total || 0, currency),
        helper: `${summary?.overdue_count || 0} factura(s) vencida(s)`,
      },
    ];
  }, [currency, statement]);

  const handleShareStatement = async () => {
    if (!activeBusiness || !customerId) return;
    try {
      const payload = await invoicesService.getCustomerStatementWhatsAppShare(
        activeBusiness.id,
        Number(customerId),
        {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }
      );
      setMessageModal({
        open: true,
        title: 'Compartir estado de cuenta',
        description: 'Mensaje listo para compartir el resumen de cartera del cliente.',
        contactName: statement?.customer.name,
        phone: payload.phone || statement?.customer.phone,
        message: payload.message,
      });
    } catch (requestError: any) {
      if ((requestError?.isOfflineRequestError || !requestError?.response) && statement) {
        setMessageModal({
          open: true,
          title: 'Compartir estado de cuenta',
          description: 'Mensaje local listo para compartir mientras recuperas conexion.',
          contactName: statement.customer.name,
          phone: statement.customer.phone,
          message: buildInvoiceStatementOfflineMessage(statement, currency),
        });
        return;
      }
      toast.error(requestError?.response?.data?.error || 'No pudimos preparar el mensaje');
    }
  };

  const handleReminderForInvoice = async (invoice: InvoiceReceivable) => {
    if (!activeBusiness) return;
    try {
      const payload = await invoicesService.getReminderShare(activeBusiness.id, invoice.invoice_id);
      setMessageModal({
        open: true,
        title: `Recordatorio ${invoice.invoice_number}`,
        description: 'Usa este mensaje para hacer seguimiento puntual a la factura seleccionada.',
        contactName: statement?.customer.name || invoice.customer_name,
        phone: payload.phone || statement?.customer.phone || invoice.customer_phone,
        message: payload.message,
      });
    } catch (requestError: any) {
      if (requestError?.isOfflineRequestError || !requestError?.response) {
        setMessageModal({
          open: true,
          title: `Recordatorio ${invoice.invoice_number}`,
          description: 'Mensaje local listo para seguimiento mientras vuelves a estar en linea.',
          contactName: statement?.customer.name || invoice.customer_name,
          phone: statement?.customer.phone || invoice.customer_phone,
          message: buildInvoiceOfflineReminderMessage(invoice),
        });
        return;
      }
      toast.error(requestError?.response?.data?.error || 'No pudimos preparar el recordatorio');
    }
  };

  const handlePrint = async () => {
    if (!activeBusiness || !customerId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('La vista imprimible del estado de cuenta necesita conexion.');
      return;
    }
    try {
      await openStatementPrintPreview(activeBusiness.id, Number(customerId), {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
    } catch (requestError: any) {
      toast.error(requestError?.message || 'No fue posible abrir la vista imprimible');
    }
  };

  const openInvoices = statement?.invoices || [];
  const paymentHistory = statement?.payments || [];

  return (
    <PageLayout>
      <PageHeader
        title={statement?.customer.name || 'Estado de cuenta'}
        description="Revisa facturas, pagos, saldos pendientes y comparte un resumen listo para seguimiento."
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={(
              <Button onClick={handleShareStatement} className="w-full sm:w-auto">
                <MessageCircleMore className="h-4 w-4" /> Compartir
              </Button>
            )}
            secondary={[
              <Link key="back" to="/invoices/receivables" className="block w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4" /> Cartera
                </Button>
              </Link>,
              <Button key="print" variant="secondary" onClick={handlePrint} className="w-full sm:w-auto">
                <FileText className="h-4 w-4" /> Imprimir
              </Button>,
            ]}
          />
        )}
      />

      <PageFilters>
        <div className="w-full sm:w-[180px]">
          <Input label="Desde" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="w-full sm:w-[180px]">
          <Input label="Hasta" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); }} className="w-full lg:w-auto">
          Limpiar corte
        </Button>
      </PageFilters>

      <PageBody className="bg-gray-50 dark:bg-gray-950/40">
        {!statement && loading ? (
          <div className="rounded-[28px] border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Cargando estado de cuenta...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        ) : !statement ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <TeachingEmptyState
              icon={SearchCheck}
              title="No encontramos este estado de cuenta"
              description="Vuelve a la cartera de facturas y abre el cliente desde una factura asociada."
              primaryActionLabel="Volver a cartera"
              onPrimaryAction={() => navigate('/invoices/receivables')}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">{card.label}</div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">{card.value}</div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{card.helper}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                {openInvoices.length === 0 ? (
                  <div className="rounded-3xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                    <TeachingEmptyState
                      icon={FileText}
                      title="No hay facturas en este corte"
                      description="Prueba ampliando las fechas o vuelve al listado general para revisar el historial completo."
                      primaryActionLabel="Ir a facturas"
                      onPrimaryAction={() => navigate('/invoices')}
                    />
                  </div>
                ) : (
                  <>
                    <DataTableContainer className="hidden md:flex">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:bg-gray-900/60">
                          <tr>
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
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {openInvoices.map((invoice) => {
                            const tone = getInvoiceCollectionTone(invoice);
                            const syncMeta = getInvoiceSyncMeta(invoice);
                            return (
                              <tr key={invoice.invoice_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="font-semibold text-gray-950 dark:text-white">{invoice.invoice_number}</div>
                                    {syncMeta && (
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
                                    {invoice.can_collect ? (
                                      <Button variant="secondary" size="sm" onClick={() => handleReminderForInvoice(invoice)}>
                                        <BellRing className="h-4 w-4" /> Recordar
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

                    <div className="grid gap-4 md:hidden">
                      {openInvoices.map((invoice) => {
                        const tone = getInvoiceCollectionTone(invoice);
                        const syncMeta = getInvoiceSyncMeta(invoice);
                        return (
                          <div
                            key={invoice.invoice_id}
                            className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-semibold text-gray-950 dark:text-white">{invoice.invoice_number}</div>
                                  {syncMeta && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${syncMeta.className}`}>
                                      {syncMeta.label}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatInvoiceDate(invoice.issue_date)}</div>
                              </div>
                              <StatusBadge status={invoice.status} />
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-950">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Vence</div>
                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{formatInvoiceDate(invoice.due_date)}</div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Saldo</div>
                                <div className={`mt-1 text-sm font-semibold ${tone.textClassName}`}>{formatInvoiceMoney(invoice.balance_due, invoice.currency)}</div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Pagado</div>
                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{formatInvoiceMoney(invoice.paid_amount, invoice.currency)}</div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Total</div>
                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{formatInvoiceMoney(invoice.total, invoice.currency)}</div>
                              </div>
                            </div>
                            <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badgeClassName}`}>
                              {getInvoiceCollectionLabel(invoice)}
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              {invoice.can_collect ? (
                                <Button variant="secondary" onClick={() => handleReminderForInvoice(invoice)} className="w-full">
                                  <BellRing className="h-4 w-4" /> Recordar
                                </Button>
                              ) : null}
                              <Link to={`/invoices/${invoice.invoice_id}`} className="block">
                                <Button variant="secondary" className="w-full">
                                  Ver factura
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

              <div className="space-y-6">
                <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Resumen del cliente</h2>
                  <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Cliente</div>
                      <div className="mt-1 font-medium text-gray-950 dark:text-white">{statement.customer.name}</div>
                    </div>
                    {statement.customer.phone && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Telefono</div>
                        <div className="mt-1">{statement.customer.phone}</div>
                      </div>
                    )}
                    {statement.customer.email && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Email</div>
                        <div className="mt-1 break-all">{statement.customer.email}</div>
                      </div>
                    )}
                    <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Cobro neto en el corte</div>
                      <div className="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
                        {formatInvoiceMoney(statement.summary.payments_received, currency)}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {statement.summary.cancelled_count} factura(s) cancelada(s) en el historial filtrado
                      </div>
                      {((statement.summary.refunded_total || 0) > 0 || (statement.summary.reversed_total || 0) > 0) && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Bruto {formatInvoiceMoney(statement.summary.gross_payments_received || 0, currency)}
                          {' • '}Ajustes {formatInvoiceMoney((statement.summary.refunded_total || 0) + (statement.summary.reversed_total || 0), currency)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Pagos recibidos</h2>
                    <Download className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {paymentHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        No hay pagos registrados en este corte.
                      </div>
                    ) : (
                      paymentHistory.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className={`font-medium ${((payment.signed_amount ?? payment.amount ?? 0) >= 0) ? 'text-gray-950 dark:text-white' : 'text-rose-700 dark:text-rose-300'}`}>
                                {`${((payment.signed_amount ?? payment.amount ?? 0) >= 0) ? '+' : '-'}${formatInvoiceMoney(Math.abs(payment.signed_amount ?? payment.amount ?? 0), currency)}`}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${getInvoicePaymentEventTone(payment)}`}>
                                  {getInvoicePaymentEventLabel(payment)}
                                </span>
                                <span>{payment.invoice_number || 'Sin factura'}{' | '}{formatInvoiceDate(payment.payment_date)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-xs text-gray-400">{payment.payment_method || 'Metodo no informado'}</div>
                              {getInvoicePaymentSyncMeta(payment) && (
                                <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getInvoicePaymentSyncMeta(payment)?.className}`}>
                                  {getInvoicePaymentSyncMeta(payment)?.label}
                                </div>
                              )}
                            </div>
                          </div>
                          {payment.note && (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{payment.note}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
