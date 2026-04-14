import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  CopyPlus,
  Download,
  FileText,
  Lock,
  MessageCircleMore,
  Pencil,
  ReceiptText,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InvoiceMessageModal } from '../components/Invoices/InvoiceMessageModal';
import { CompactActionGroup, PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { InvoiceDocumentPreview } from '../components/Invoices/InvoiceDocumentPreview';
import {
  buildInvoiceOfflineReminderMessage,
  buildInvoiceOfflineShareMessage,
  getInvoiceCollectionLabel,
  getInvoiceCollectionTone,
  getInvoiceEditability,
  getInvoicePaymentEventLabel,
  getInvoicePaymentEventTone,
  getInvoicePaymentSyncMeta,
  getInvoicePaymentState,
  getInvoiceSyncMeta,
  INVOICE_STATUS_META,
  formatInvoiceDate,
  formatInvoiceMoney,
} from '../components/Invoices/invoiceHelpers';
import { Button } from '../components/ui/Button';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Input } from '../components/ui/Input';
import { TreasuryAccountSelect } from '../components/Treasury/TreasuryAccountSelect';
import { invoicesService } from '../services/invoicesService';
import { downloadFile } from '../utils/downloadHelper';
import { useBusinessStore } from '../store/businessStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { InvoiceSettings } from '../types';
import { OFFLINE_SNAPSHOT_APPLIED_EVENT } from '../services/offlineSyncService';
import { isOfflineProductMode } from '../runtime/runtimeMode';

const openPrintableInvoice = async (businessId: number, invoiceId: number) => {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('Tu navegador bloqueo la apertura de la vista imprimible');
  }

  previewWindow.document.open();
  previewWindow.document.write('<html><head><title>Cargando factura...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Cargando factura...</body></html>');
  previewWindow.document.close();

  const html = await invoicesService.getPrintableHtml(businessId, invoiceId);
  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
  previewWindow.focus();
};

export const InvoiceDetail = () => {
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const { activeBusiness } = useBusinessStore();
  const {
    selectedInvoice,
    fetchInvoice,
    duplicateInvoice,
    updateInvoiceStatus,
    createInvoicePayment,
    saving,
    loading,
  } = useInvoiceStore();

  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentTreasuryAccountId, setPaymentTreasuryAccountId] = useState<number | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [adjustmentDraft, setAdjustmentDraft] = useState<{
    paymentId: number;
    type: 'refund' | 'reversal';
  } | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | undefined>(undefined);
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjustmentMethod, setAdjustmentMethod] = useState('transfer');
  const [adjustmentTreasuryAccountId, setAdjustmentTreasuryAccountId] = useState<number | null>(null);
  const [adjustmentNote, setAdjustmentNote] = useState('');
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
    if (!activeBusiness || !invoiceId) return;
    fetchInvoice(activeBusiness.id, Number(invoiceId));
    invoicesService.getSettings(activeBusiness.id).then(setSettings).catch(() => setSettings(null));
  }, [activeBusiness, fetchInvoice, invoiceId]);

  useEffect(() => {
    if (!activeBusiness || !invoiceId || typeof window === 'undefined') return;

    const businessId = activeBusiness.id;
    const currentInvoiceId = Number(invoiceId);
    const handleSnapshotApplied = (event: Event) => {
      const customEvent = event as CustomEvent<{ businessIds?: number[] }>;
      const businessIds = customEvent.detail?.businessIds || [];
      if (businessIds.length > 0 && !businessIds.includes(businessId)) {
        return;
      }
      void fetchInvoice(businessId, currentInvoiceId);
    };

    window.addEventListener(OFFLINE_SNAPSHOT_APPLIED_EVENT, handleSnapshotApplied as EventListener);
    return () => {
      window.removeEventListener(OFFLINE_SNAPSHOT_APPLIED_EVENT, handleSnapshotApplied as EventListener);
    };
  }, [activeBusiness, fetchInvoice, invoiceId]);

  useEffect(() => {
    if (!selectedInvoice) return;
    setPaymentAmount(selectedInvoice.outstanding_balance || undefined);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod(selectedInvoice.payment_method || 'transfer');
    setPaymentTreasuryAccountId(null);
    setPaymentNote('');
    setAdjustmentDraft(null);
  }, [selectedInvoice]);

  const handleStatusUpdate = async (status: 'draft' | 'sent' | 'cancelled') => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const invoice = await updateInvoiceStatus(activeBusiness.id, selectedInvoice.id, status);
      toast.success(
        isOfflineProductMode()
          ? 'Estado actualizado localmente'
          : invoice.sync_status === 'pending'
          ? 'Estado actualizado offline. Se sincronizara al reconectar.'
          : 'Estado actualizado'
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible actualizar el estado');
    }
  };

  const handleDuplicate = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const duplicated = await duplicateInvoice(activeBusiness.id, selectedInvoice.id);
      toast.success('Generamos una copia lista para editar');
      navigate(`/invoices/${duplicated.id}/edit`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible duplicar la factura');
    }
  };

  const handlePrepareInvoiceShare = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const share = await invoicesService.getWhatsAppShare(activeBusiness.id, selectedInvoice.id);
      setMessageModal({
        open: true,
        title: `Compartir ${selectedInvoice.invoice_number}`,
        description: 'Mensaje listo para reenviar la factura o copiarlo antes de compartir.',
        contactName: selectedInvoice.customer_name,
        phone: share.phone || selectedInvoice.customer_phone,
        message: share.message,
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        setMessageModal({
          open: true,
          title: `Compartir ${selectedInvoice.invoice_number}`,
          description: 'Mensaje listo para compartir desde tu dispositivo.',
          contactName: selectedInvoice.customer_name,
          phone: selectedInvoice.customer_phone,
          message: buildInvoiceOfflineShareMessage(selectedInvoice),
        });
        return;
      }
      toast.error(error?.response?.data?.error || 'No fue posible preparar el mensaje para WhatsApp');
    }
  };

  const handlePrepareReminder = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const reminder = await invoicesService.getReminderShare(activeBusiness.id, selectedInvoice.id);
      setMessageModal({
        open: true,
        title: `Recordatorio ${selectedInvoice.invoice_number}`,
        description: 'Texto listo para seguimiento de saldo pendiente y vencimiento.',
        contactName: selectedInvoice.customer_name,
        phone: reminder.phone || selectedInvoice.customer_phone,
        message: reminder.message,
      });
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        setMessageModal({
          open: true,
          title: `Recordatorio ${selectedInvoice.invoice_number}`,
          description: 'Mensaje listo para seguimiento desde tu dispositivo.',
          contactName: selectedInvoice.customer_name,
          phone: selectedInvoice.customer_phone,
          message: buildInvoiceOfflineReminderMessage({
            invoice_number: selectedInvoice.invoice_number,
            customer_name: selectedInvoice.customer_name || null,
            balance_due: selectedInvoice.outstanding_balance,
            currency: selectedInvoice.currency,
            due_date: selectedInvoice.due_date || null,
            notes: selectedInvoice.notes || null,
            items: selectedInvoice.items,
          }),
        });
        return;
      }
      toast.error(error?.response?.data?.error || 'No fue posible preparar el recordatorio');
    }
  };

  const handleCopyReminderText = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const reminder = await invoicesService.getReminderShare(activeBusiness.id, selectedInvoice.id)
        .catch((error: any) => {
          if (error?.isOfflineRequestError || !error?.response) {
            return {
              message: buildInvoiceOfflineReminderMessage({
                invoice_number: selectedInvoice.invoice_number,
                customer_name: selectedInvoice.customer_name || null,
                balance_due: selectedInvoice.outstanding_balance,
                currency: selectedInvoice.currency,
                due_date: selectedInvoice.due_date || null,
                notes: selectedInvoice.notes || null,
                items: selectedInvoice.items,
              }),
            };
          }
          throw error;
        });
      await navigator.clipboard.writeText(reminder.message);
      toast.success('Recordatorio copiado al portapapeles');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible copiar el recordatorio');
    }
  };

  const handleDownloadPdf = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('La descarga PDF no esta disponible en este momento.');
      return;
    }
    const token = localStorage.getItem('token') || undefined;
    await downloadFile(
      invoicesService.getPdfDownloadPath(activeBusiness.id, selectedInvoice.id),
      { filename: `factura_${selectedInvoice.invoice_number}.pdf` },
      token
    );
  };

  const handlePrint = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('La vista imprimible no esta disponible en este momento.');
      return;
    }
    try {
      await openPrintableInvoice(activeBusiness.id, selectedInvoice.id);
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible abrir la vista imprimible');
    }
  };

  const handleRecordPayment = async (amount?: number) => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const invoice = await createInvoicePayment(activeBusiness.id, selectedInvoice.id, {
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        treasury_account_id: paymentTreasuryAccountId,
        note: paymentNote || undefined,
      });
      toast.success(
        isOfflineProductMode()
          ? (amount && amount < selectedInvoice.outstanding_balance ? 'Pago parcial registrado localmente' : 'Pago registrado localmente')
          : invoice.sync_status === 'pending'
          ? 'Pago guardado offline. Se sincronizara al reconectar.'
          : amount && amount < selectedInvoice.outstanding_balance
            ? 'Pago parcial registrado'
            : 'Factura marcada como pagada'
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible registrar el pago');
    }
  };

  const openPaymentAdjustment = (
    paymentId: number,
    type: 'refund' | 'reversal',
    defaults?: { amount?: number; paymentMethod?: string | null; treasuryAccountId?: number | null }
  ) => {
    setAdjustmentDraft({ paymentId, type });
    setAdjustmentAmount(defaults?.amount || undefined);
    setAdjustmentDate(new Date().toISOString().split('T')[0]);
    setAdjustmentMethod(defaults?.paymentMethod || selectedInvoice?.payment_method || 'transfer');
    setAdjustmentTreasuryAccountId(defaults?.treasuryAccountId ?? null);
    setAdjustmentNote('');
  };

  const handleSubmitPaymentAdjustment = async () => {
    if (!activeBusiness || !selectedInvoice || !adjustmentDraft) return;
    const actionLabel = adjustmentDraft.type === 'refund' ? 'reembolso' : 'reversion';
    const confirmed = window.confirm(
      adjustmentDraft.type === 'refund'
        ? 'Vas a registrar un reembolso que reducira caja y reabrira el saldo por cobrar. ¿Deseas continuar?'
        : 'Vas a registrar una reversion del cobro. ¿Deseas continuar?'
    );
    if (!confirmed) return;

    try {
      if (adjustmentDraft.type === 'refund') {
        await invoicesService.refundPayment(activeBusiness.id, selectedInvoice.id, adjustmentDraft.paymentId, {
          amount: adjustmentAmount,
          payment_date: adjustmentDate,
          payment_method: adjustmentMethod,
          treasury_account_id: adjustmentTreasuryAccountId,
          note: adjustmentNote || undefined,
        });
      } else {
        await invoicesService.reversePayment(activeBusiness.id, selectedInvoice.id, adjustmentDraft.paymentId, {
          amount: adjustmentAmount,
          payment_date: adjustmentDate,
          payment_method: adjustmentMethod,
          treasury_account_id: adjustmentTreasuryAccountId,
          note: adjustmentNote || undefined,
        });
      }
      await fetchInvoice(activeBusiness.id, selectedInvoice.id);
      setAdjustmentDraft(null);
      toast.success(`Se registro el ${actionLabel} correctamente`);
    } catch (error: any) {
      toast.error(
        error?.isOfflineRequestError || !error?.response
          ? `El ${actionLabel} no esta disponible en este momento.`
          : error?.response?.data?.error || `No fue posible registrar el ${actionLabel}`
      );
    }
  };

  const statusMeta = selectedInvoice ? INVOICE_STATUS_META[selectedInvoice.status] : null;
  const syncMeta = getInvoiceSyncMeta(selectedInvoice);
  const editability = getInvoiceEditability(selectedInvoice);
  const paymentState = getInvoicePaymentState(selectedInvoice);
  const collectionTone = selectedInvoice
    ? getInvoiceCollectionTone({
        status: selectedInvoice.status,
        balance_due: selectedInvoice.outstanding_balance,
        days_overdue: selectedInvoice.status === 'overdue'
          ? Math.max(Math.abs(Number(selectedInvoice.days_until_due || 0)), 0)
          : 0,
      })
    : null;
  const collectionLabel = selectedInvoice
    ? getInvoiceCollectionLabel({
        status: selectedInvoice.status,
        balance_due: selectedInvoice.outstanding_balance,
        days_overdue: selectedInvoice.status === 'overdue'
          ? Math.max(Math.abs(Number(selectedInvoice.days_until_due || 0)), 0)
          : 0,
        days_until_due: selectedInvoice.days_until_due,
      })
    : null;
  const headerSecondaryActions = [
    ...(selectedInvoice && editability.canEdit
      ? [
          <Link key="back" to="/invoices" className="block w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </Link>,
        ]
      : []),
    ...(!isOfflineProductMode()
      ? [
          <Link key="sync" to="/invoices/sync" className="block w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">
              <ShieldAlert className="h-4 w-4" /> Sync
            </Button>
          </Link>,
        ]
      : []),
  ];

  return (
    <PageLayout>
      <PageHeader
        title={selectedInvoice?.invoice_number || 'Detalle de factura'}
        description="Consulta el documento, sigue el estado de pago y ejecuta las acciones principales sin salir de la ficha."
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={
              selectedInvoice && editability.canEdit ? (
                <Link to={`/invoices/${selectedInvoice.id}/edit`} className="block w-full">
                  <Button className="w-full sm:w-auto">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                </Link>
              ) : (
                <Link to="/invoices" className="block w-full">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    <ArrowLeft className="h-4 w-4" /> Volver
                  </Button>
                </Link>
              )
            }
            secondary={headerSecondaryActions}
          />
        )}
      />

      <PageBody className="app-canvas">
        {!selectedInvoice && loading ? (
          <div className="app-surface rounded-[28px] p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Cargando factura...
          </div>
        ) : !selectedInvoice ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
            No encontramos la factura solicitada.
          </div>
        ) : (
          <div className="space-y-6">
            {!isOfflineProductMode() && syncMeta && (
              <div className={`rounded-[24px] border px-4 py-4 text-sm ${selectedInvoice.sync_status === 'failed' || selectedInvoice.sync_status === 'conflicted'
                ? selectedInvoice.sync_status === 'conflicted'
                  ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-900/10 dark:text-fuchsia-200'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-200'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200'}`}>
                {selectedInvoice.sync_status === 'conflicted'
                  ? 'Esta factura tiene un conflicto con una versión más nueva del servidor. Abre el centro de sync para revisar el detalle y decidir cómo recuperarla.'
                  : selectedInvoice.sync_status === 'failed'
                  ? 'Esta factura tiene cambios o pagos pendientes que fallaron al sincronizarse. Sigue visible y podras reintentarlo al recuperar conexion.'
                  : 'Esta factura incluye cambios locales pendientes. Los saldos y estados mostrados se sincronizaran automaticamente cuando regreses a estar en linea.'}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="app-surface rounded-[28px] p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Estado</div>
                <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusMeta?.className}`}>
                  {statusMeta?.label}
                </div>
                {!isOfflineProductMode() && syncMeta && (
                  <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${syncMeta.className}`}>
                    {syncMeta.label}
                  </div>
                )}
                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Base: {selectedInvoice.status_base || selectedInvoice.status}
                </div>
              </div>
              <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-white via-white to-blue-50/70 p-5 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Total</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
                  {formatInvoiceMoney(selectedInvoice.total, selectedInvoice.currency)}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Emitida {formatInvoiceDate(selectedInvoice.issue_date)}
                </div>
              </div>
              <div className="app-surface rounded-[28px] p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Cobrado neto</div>
                <div className="mt-3 text-2xl font-semibold text-gray-950 dark:text-white">
                  {formatInvoiceMoney(selectedInvoice.amount_paid, selectedInvoice.currency)}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Metodo: {selectedInvoice.payment_method || 'Por definir'}
                </div>
                {((selectedInvoice.refunded_amount || 0) > 0 || (selectedInvoice.reversed_amount || 0) > 0) && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Bruto {formatInvoiceMoney(selectedInvoice.gross_collected_amount || 0, selectedInvoice.currency)}
                    {' • '}Ajustes {formatInvoiceMoney((selectedInvoice.refunded_amount || 0) + (selectedInvoice.reversed_amount || 0), selectedInvoice.currency)}
                  </div>
                )}
              </div>
              <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-white via-white to-emerald-50/70 p-5 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Saldo</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
                  {formatInvoiceMoney(selectedInvoice.outstanding_balance, selectedInvoice.currency)}
                </div>
                <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${collectionTone?.badgeClassName || ''}`}>
                  {collectionLabel}
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Vence {formatInvoiceDate(selectedInvoice.due_date)}
                </div>
              </div>
            </div>

            <div className="app-surface rounded-[24px] p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Acciones principales</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Comparte, imprime, ajusta el estado o abre el seguimiento del cliente sin salir del detalle.
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleDuplicate} isLoading={saving}>
                <CopyPlus className="h-4 w-4" /> Duplicar
              </Button>
              <Button variant="secondary" onClick={handlePrepareInvoiceShare}>
                <MessageCircleMore className="h-4 w-4" /> Reenviar factura
              </Button>
              {selectedInvoice.customer_id && (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/invoices/customers/${selectedInvoice.customer_id}/statement`)}
                >
                  <ReceiptText className="h-4 w-4" /> Estado de cuenta
                </Button>
              )}
              {selectedInvoice.outstanding_balance > 0.01 && selectedInvoice.status !== 'draft' && selectedInvoice.status !== 'cancelled' && (
                <>
                  <Button variant="secondary" onClick={handlePrepareReminder}>
                    <BellRing className="h-4 w-4" /> Recordatorio
                  </Button>
                  <Button variant="secondary" onClick={handleCopyReminderText}>
                    Copiar recordatorio
                  </Button>
                </>
              )}
              {selectedInvoice.status !== 'sent' && selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                <Button variant="secondary" onClick={() => handleStatusUpdate('sent')} isLoading={saving}>
                  <Send className="h-4 w-4" /> Marcar enviada
                </Button>
              )}
              {selectedInvoice.status !== 'cancelled' && selectedInvoice.amount_paid <= 0 && (
                <Button variant="secondary" onClick={() => handleStatusUpdate('cancelled')} isLoading={saving}>
                  Cancelar
                </Button>
              )}
              <Button variant="secondary" onClick={handlePrint}>
                <FileText className="h-4 w-4" /> Vista imprimible
              </Button>
              <Button variant="secondary" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" /> Descargar PDF
              </Button>
              </div>
            </div>

            {!editability.canEdit && (
              <div className="flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{editability.reason}</div>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="app-surface min-w-0 rounded-[28px] p-4 shadow-sm">
                <div className="app-muted-panel mb-4 grid gap-3 rounded-[24px] p-4 sm:grid-cols-3">
                  <div className="app-surface rounded-2xl px-3 py-3 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Cliente</div>
                    <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {selectedInvoice.customer_name || 'Cliente ocasional'}
                    </div>
                  </div>
                  <div className="app-surface rounded-2xl px-3 py-3 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Cobrado</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatInvoiceMoney(selectedInvoice.amount_paid, selectedInvoice.currency)}
                    </div>
                  </div>
                  <div className="app-surface rounded-2xl px-3 py-3 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Saldo</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatInvoiceMoney(selectedInvoice.outstanding_balance, selectedInvoice.currency)}
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <InvoiceDocumentPreview
                    business={activeBusiness}
                    invoice={selectedInvoice}
                    settings={settings}
                    compact
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="app-surface rounded-[28px] p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Registrar pago</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Usa el mismo detalle para abonos parciales o para cerrar la factura por completo.
                  </p>

                  {!paymentState.canRecordPayment ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {paymentState.reason}
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-3 rounded-[24px] border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900/30 dark:bg-blue-900/10 sm:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">Saldo actual</div>
                          <div className="mt-1 text-xl font-semibold text-blue-950 dark:text-blue-100">
                            {formatInvoiceMoney(selectedInvoice.outstanding_balance, selectedInvoice.currency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">Cobrado neto</div>
                          <div className="mt-1 text-xl font-semibold text-blue-950 dark:text-blue-100">
                            {formatInvoiceMoney(selectedInvoice.amount_paid, selectedInvoice.currency)}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Monto</label>
                        <CurrencyInput value={paymentAmount} onChange={setPaymentAmount} />
                      </div>
                      <Input label="Fecha" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Metodo</label>
                        <select
                          className="app-select"
                          value={paymentMethod}
                          onChange={(event) => setPaymentMethod(event.target.value)}
                        >
                          <option value="transfer">Transferencia</option>
                          <option value="cash">Efectivo</option>
                          <option value="card">Tarjeta</option>
                          <option value="nequi">Nequi</option>
                          <option value="daviplata">Daviplata</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                      <TreasuryAccountSelect
                        businessId={activeBusiness?.id}
                        value={paymentTreasuryAccountId}
                        onChange={setPaymentTreasuryAccountId}
                        label="Destino en tesoreria"
                        placeholder="Usar cuenta por defecto del metodo"
                        helperText="Asocia el cobro con la caja o banco donde entro el dinero."
                        showBalance
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nota</label>
                        <textarea
                          value={paymentNote}
                          onChange={(event) => setPaymentNote(event.target.value)}
                          className="app-textarea min-h-[110px]"
                          placeholder="Referencia interna, soporte o aclaracion."
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleRecordPayment(paymentAmount)}
                          isLoading={saving}
                        >
                          Registrar abono
                        </Button>
                        <Button
                          onClick={() => handleRecordPayment(selectedInvoice.outstanding_balance)}
                          isLoading={saving}
                        >
                          Marcar pagada
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="app-surface rounded-[28px] p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Historial de pagos</h2>
                  <div className="mt-4 space-y-3">
                    {selectedInvoice.payments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Aun no hay pagos registrados para esta factura.
                      </div>
                    ) : (
                      selectedInvoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="app-muted-panel rounded-[24px] px-4 py-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className={`text-lg font-semibold ${((payment.signed_amount ?? payment.amount ?? 0) >= 0) ? 'text-gray-950 dark:text-white' : 'text-rose-700 dark:text-rose-300'}`}>
                                {`${((payment.signed_amount ?? payment.amount ?? 0) >= 0) ? '+' : '-'}${formatInvoiceMoney(Math.abs(payment.signed_amount ?? payment.amount ?? 0), selectedInvoice.currency)}`}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${getInvoicePaymentEventTone(payment)}`}>
                                  {getInvoicePaymentEventLabel(payment)}
                                </span>
                                <span>{(payment.payment_method || 'Metodo no informado')}{' | '}{formatInvoiceDate(payment.payment_date)}</span>
                              </div>
                              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {payment.treasury_account_name
                                  ? `Tesoreria: ${payment.treasury_account_name}`
                                  : 'Tesoreria: cuenta por defecto del metodo'}
                              </div>
                              {payment.source_payment_id && (
                                <div className="text-xs text-gray-400">Ajuste aplicado sobre el pago #{payment.source_payment_id}</div>
                              )}
                              {payment.event_type === 'payment' && (payment.available_adjustment_amount || 0) > 0.01 && (
                                <div className="text-xs text-gray-400">
                                  Disponible para ajuste: {formatInvoiceMoney(payment.available_adjustment_amount || 0, selectedInvoice.currency)}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-xs text-gray-400">{payment.created_by_name || 'Sistema'}</div>
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
                          {payment.event_type === 'payment'
                            && (payment.available_adjustment_amount || 0) > 0.01
                            && !payment.is_offline_record
                            && payment.sync_status !== 'pending'
                            && payment.sync_status !== 'failed'
                            && payment.sync_status !== 'blocked'
                            && payment.sync_status !== 'conflicted' && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                className="text-xs"
                                onClick={() => openPaymentAdjustment(payment.id, 'reversal', {
                                  amount: payment.available_adjustment_amount,
                                  paymentMethod: payment.payment_method,
                                  treasuryAccountId: payment.treasury_account_id ?? null,
                                })}
                              >
                                Reversar cobro
                              </Button>
                              <Button
                                variant="secondary"
                                className="text-xs"
                                onClick={() => openPaymentAdjustment(payment.id, 'refund', {
                                  amount: payment.available_adjustment_amount,
                                  paymentMethod: payment.payment_method,
                                  treasuryAccountId: payment.treasury_account_id ?? null,
                                })}
                              >
                                Reembolsar
                              </Button>
                            </div>
                          )}
                          {adjustmentDraft?.paymentId === payment.id && (
                            <div className="app-surface mt-4 rounded-2xl border border-blue-200 p-4 dark:border-blue-900/40">
                              <div className="text-sm font-semibold text-gray-950 dark:text-white">
                                {adjustmentDraft.type === 'refund' ? 'Registrar reembolso' : 'Registrar reversion'}
                              </div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Este ajuste reducira el cobro neto y quedara reflejado en tesoreria.
                              </div>
                              <div className="mt-4 space-y-3">
                                <div>
                                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Monto</label>
                                  <CurrencyInput value={adjustmentAmount} onChange={setAdjustmentAmount} />
                                </div>
                                <Input label="Fecha" type="date" value={adjustmentDate} onChange={(event) => setAdjustmentDate(event.target.value)} />
                                <div>
                                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Metodo</label>
                                  <select
                                    className="app-select"
                                    value={adjustmentMethod}
                                    onChange={(event) => setAdjustmentMethod(event.target.value)}
                                  >
                                    <option value="transfer">Transferencia</option>
                                    <option value="cash">Efectivo</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="nequi">Nequi</option>
                                    <option value="daviplata">Daviplata</option>
                                    <option value="other">Otro</option>
                                  </select>
                                </div>
                                <TreasuryAccountSelect
                                  businessId={activeBusiness?.id}
                                  value={adjustmentTreasuryAccountId}
                                  onChange={setAdjustmentTreasuryAccountId}
                                  label="Cuenta afectada"
                                  placeholder="Usar cuenta del metodo"
                                  helperText="Selecciona la caja o banco impactado por el ajuste."
                                  showBalance
                                />
                                <div>
                                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nota</label>
                                  <textarea
                                    value={adjustmentNote}
                                    onChange={(event) => setAdjustmentNote(event.target.value)}
                                    className="app-textarea min-h-[96px]"
                                    placeholder="Motivo del reembolso o de la reversion."
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button onClick={handleSubmitPaymentAdjustment} isLoading={saving}>
                                    Guardar ajuste
                                  </Button>
                                  <Button variant="secondary" onClick={() => setAdjustmentDraft(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            </div>
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
