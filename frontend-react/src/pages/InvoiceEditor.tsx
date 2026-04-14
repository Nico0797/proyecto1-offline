import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CopyPlus, Lock, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CompactActionGroup, PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { InvoiceDocumentPreview } from '../components/Invoices/InvoiceDocumentPreview';
import {
  buildPreviewInvoice,
  calculateInvoiceTotals,
  formatInvoiceMoney,
  getInvoiceEditability,
  getInvoiceSyncMeta,
} from '../components/Invoices/invoiceHelpers';
import { Button } from '../components/ui/Button';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Input } from '../components/ui/Input';
import { SelectField } from '../components/ui/SelectField';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useBusinessStore } from '../store/businessStore';
import { useCustomerStore } from '../store/customerStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { useProductStore } from '../store/productStore';
import { invoicesService } from '../services/invoicesService';
import { InvoiceItem, InvoiceSettings, InvoiceStatus } from '../types';
import { useBreakpoint } from '../tour/useBreakpoint';
import { isOfflineProductMode } from '../runtime/runtimeMode';

type EditableInvoiceItem = InvoiceItem & { localId: string };
type MobileStep = 'basics' | 'items' | 'preview';

const buildEmptyItem = (sortOrder = 0): EditableInvoiceItem => ({
  localId: Math.random().toString(36).slice(2),
  product_id: null,
  product_name: null,
  description: '',
  quantity: 1,
  unit_price: 0,
  discount: 0,
  tax_rate: 0,
  line_total: 0,
  sort_order: sortOrder,
});

const buildLineTotal = (item: EditableInvoiceItem) => {
  const subtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
  const taxable = Math.max(subtotal - Number(item.discount || 0), 0);
  return taxable + taxable * (Number(item.tax_rate || 0) / 100);
};

export const InvoiceEditor = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!invoiceId;
  const { isMobile } = useBreakpoint();
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();
  const {
    selectedInvoice,
    fetchInvoice,
    createInvoice,
    updateInvoice,
    duplicateInvoice,
    saving,
    loading,
  } = useInvoiceStore();

  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [bootstrappedKey, setBootstrappedKey] = useState('');
  const [step, setStep] = useState<MobileStep>('basics');

  const [customerId, setCustomerId] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'cancelled'>('draft');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<EditableInvoiceItem[]>([buildEmptyItem()]);

  useEffect(() => {
    if (!activeBusiness) return;
    fetchCustomers(activeBusiness.id);
    fetchProducts(activeBusiness.id);
    invoicesService.getSettings(activeBusiness.id).then(setSettings).catch(() => {
      setSettings({
        prefix: 'INV',
        brand_color: '#2563EB',
        accent_color: '#0F172A',
      } as InvoiceSettings);
    });

    if (invoiceId) {
      void fetchInvoice(activeBusiness.id, Number(invoiceId));
    }
  }, [activeBusiness, fetchCustomers, fetchProducts, fetchInvoice, invoiceId]);

  useEffect(() => {
    if (!activeBusiness || !settings) return;

    const key = `${activeBusiness.id}:${invoiceId || 'new'}:${selectedInvoice?.id || 'none'}`;
    if (bootstrappedKey === key) return;
    if (isEditing && selectedInvoice?.id !== Number(invoiceId)) return;

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0];

    if (selectedInvoice && isEditing) {
      setCustomerId(selectedInvoice.customer_id || '');
      setIssueDate(selectedInvoice.issue_date || today);
      setDueDate(selectedInvoice.due_date || '');
      setStatus(
        ['draft', 'sent', 'cancelled'].includes(selectedInvoice.status)
          ? (selectedInvoice.status as 'draft' | 'sent' | 'cancelled')
          : 'sent'
      );
      setPaymentMethod(selectedInvoice.payment_method || 'transfer');
      setNotes(selectedInvoice.notes || '');
      setItems(
        selectedInvoice.items.length
          ? selectedInvoice.items.map((item, index) => ({
              ...item,
              localId: `${item.id || index}-${Math.random().toString(36).slice(2)}`,
              line_total: Number(item.line_total || 0),
            }))
          : [buildEmptyItem()]
      );
    } else {
      setCustomerId('');
      setIssueDate(today);
      setDueDate(nextWeek);
      setStatus('draft');
      setPaymentMethod('transfer');
      setNotes(settings.default_notes || '');
      setItems([buildEmptyItem()]);
    }

    setBootstrappedKey(key);
  }, [activeBusiness, bootstrappedKey, invoiceId, isEditing, selectedInvoice, settings]);

  const selectedCustomer = customers.find((customer) => customer.id === Number(customerId)) || null;
  const editability = getInvoiceEditability(selectedInvoice);

  const totals = useMemo(() => calculateInvoiceTotals(items), [items]);
  const lineErrors = useMemo(
    () =>
      items.map((item) => {
        const description = String(item.description || '').trim();
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const discount = Number(item.discount || 0);
        const taxRate = Number(item.tax_rate || 0);
        const subtotal = quantity * unitPrice;

        if (!description) return 'La descripcion es obligatoria.';
        if (quantity <= 0) return 'La cantidad debe ser mayor a 0.';
        if (unitPrice < 0) return 'El precio no puede ser negativo.';
        if (discount < 0) return 'El descuento no puede ser negativo.';
        if (taxRate < 0) return 'El impuesto no puede ser negativo.';
        if (discount > subtotal) return 'El descuento no puede superar el subtotal de la linea.';
        return null;
      }),
    [items]
  );
  const hasLineErrors = lineErrors.some(Boolean);

  const previewInvoice = buildPreviewInvoice({
    business: activeBusiness,
    customer: selectedCustomer,
    settings,
    values: {
      id: selectedInvoice?.id,
      invoice_number: selectedInvoice?.invoice_number || `${settings?.prefix || 'INV'}-BORRADOR`,
      status: status as InvoiceStatus,
      issue_date: issueDate,
      due_date: dueDate || null,
      currency: activeBusiness?.currency || 'COP',
      customer_id: customerId ? Number(customerId) : null,
      payment_method: paymentMethod,
      notes,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      tax_total: totals.taxTotal,
      total: totals.total,
      amount_paid: selectedInvoice?.amount_paid || 0,
      outstanding_balance: Math.max(totals.total - Number(selectedInvoice?.amount_paid || 0), 0),
      items: items.map((item, index) => ({
        ...item,
        sort_order: index,
        line_total: buildLineTotal(item),
      })),
    },
  });

  const updateItem = (localId: string, updates: Partial<EditableInvoiceItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;
        const next = { ...item, ...updates };
        return { ...next, line_total: buildLineTotal(next) };
      })
    );
  };

  const handleProductChange = (localId: string, rawValue: string) => {
    if (!rawValue) {
      updateItem(localId, { product_id: null, product_name: null });
      return;
    }
    const productId = Number(rawValue);
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    updateItem(localId, {
      product_id: product.id,
      product_name: product.name,
      description: product.name,
      unit_price: Number(product.price || 0),
      tax_rate: 0,
    });
  };

  const handleAddItem = () => {
    setItems((current) => [...current, buildEmptyItem(current.length)]);
  };

  const handleDuplicateItem = (localId: string) => {
    setItems((current) => {
      const original = current.find((item) => item.localId === localId);
      if (!original) return current;
      return [
        ...current,
        {
          ...original,
          localId: Math.random().toString(36).slice(2),
          sort_order: current.length,
        },
      ];
    });
  };

  const handleRemoveItem = (localId: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.localId !== localId);
      return next.length ? next : [buildEmptyItem()];
    });
  };

  const handleSubmit = async () => {
    if (!activeBusiness) return;
    if (isEditing && !editability.canEdit) {
      toast.error(editability.reason || 'Esta factura ya no se puede editar.');
      return;
    }

    const normalizedItems = items.map((item, index) => ({
      product_id: item.product_id || null,
      description: String(item.description || '').trim(),
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      discount: Number(item.discount || 0),
      tax_rate: Number(item.tax_rate || 0),
      sort_order: index,
    }));

    if (!issueDate) {
      toast.error('La fecha de emision es requerida.');
      return;
    }
    if (!dueDate) {
      toast.error('La fecha de vencimiento es requerida.');
      return;
    }
    if (issueDate && dueDate && dueDate < issueDate) {
      toast.error('La fecha de vencimiento no puede ser anterior a la fecha de emision.');
      return;
    }

    if (hasLineErrors) {
      toast.error('Revisa las lineas de la factura antes de guardar.');
      return;
    }

    try {
      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        issue_date: issueDate,
        due_date: dueDate || null,
        status,
        currency: activeBusiness.currency || 'COP',
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
        items: normalizedItems,
      };

      const invoice = isEditing && selectedInvoice
        ? await updateInvoice(activeBusiness.id, selectedInvoice.id, payload)
        : await createInvoice(activeBusiness.id, payload);

      toast.success(
        isOfflineProductMode()
          ? (isEditing ? 'Factura actualizada localmente' : 'Factura guardada localmente')
          : invoice.sync_status === 'pending'
          ? (isEditing ? 'Factura actualizada offline. Se sincronizara al reconectar.' : 'Factura guardada offline. Se sincronizara al reconectar.')
          : (isEditing ? 'Factura actualizada correctamente' : 'Factura creada correctamente')
      );
      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar la factura');
    }
  };

  const handleDuplicateInvoice = async () => {
    if (!activeBusiness || !selectedInvoice) return;
    try {
      const duplicated = await duplicateInvoice(activeBusiness.id, selectedInvoice.id);
      toast.success('Creamos una copia editable de la factura');
      navigate(`/invoices/${duplicated.id}/edit`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible duplicar la factura');
    }
  };

  const renderBasicsSection = () => (
      <div className="app-surface space-y-5 rounded-[28px] p-5 shadow-sm">
      <div className="app-muted-panel flex flex-col gap-3 rounded-[24px] p-4">
        <div>
          <h2 className="text-lg font-semibold app-text">Datos base y contexto comercial</h2>
          <p className="mt-1 text-sm leading-6 app-text-muted">
            Define el cliente, el momento del documento y las notas que deben acompañar la factura.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SearchableSelect
            label="Cliente"
            helper="Puedes facturar a un cliente registrado o dejar el documento como cliente ocasional."
            sheetTitle="Seleccionar cliente"
            searchPlaceholder="Buscar cliente..."
            placeholder="Cliente ocasional"
            options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
            value={customerId}
            onChange={(v) => setCustomerId(v ? Number(v) : '')}
          />
        </div>
        <Input label="Fecha de emision" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
        <Input label="Fecha de vencimiento" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        <SelectField
          label="Estado base"
          value={status}
          onChange={(event) => setStatus(event.target.value as 'draft' | 'sent' | 'cancelled')}
        >
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="cancelled">Cancelada</option>
        </SelectField>
        <SelectField
          label="Metodo de pago"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        >
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="nequi">Nequi</option>
          <option value="daviplata">Daviplata</option>
          <option value="other">Otro</option>
        </SelectField>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium app-text-secondary">Notas</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="app-textarea min-h-[150px]"
          placeholder="Notas visibles en el documento o contexto comercial."
        />
      </div>
    </div>
  );

  const renderItemsSection = () => (
    <div className="app-elevated-card space-y-6 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold app-text">Lineas de factura</h2>
          <p className="text-sm leading-6 app-text-muted">
            Mezcla productos del catalogo con lineas manuales y revisa el total en vivo.
          </p>
        </div>
        <Button variant="secondary" onClick={handleAddItem}>
          <Plus className="h-4 w-4" /> Agregar linea
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.localId}
            className={`${
              lineErrors[index]
                ? 'app-inline-panel-danger rounded-[24px] p-4'
                : 'app-surface rounded-[24px] p-4'
            }`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="app-chip inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm">
                Linea {index + 1}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="icon" onClick={() => handleDuplicateItem(item.localId)}>
                  <CopyPlus className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => handleRemoveItem(item.localId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1.4fr_0.7fr_0.9fr_0.8fr_0.8fr_0.9fr]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] app-text-muted">Producto</label>
                <SelectField
                  className="text-sm"
                  value={item.product_id || ''}
                  onChange={(event) => handleProductChange(item.localId, event.target.value)}
                >
                  <option value="">Linea manual</option>
                  {products.filter((product) => product.active).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] app-text-muted">Descripcion</label>
                <Input
                  value={item.description}
                  onChange={(event) => updateItem(item.localId, { description: event.target.value })}
                  placeholder={`Linea ${index + 1}`}
                />
              </div>
              <Input
                label="Cantidad"
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(event) => updateItem(item.localId, { quantity: Number(event.target.value) })}
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] app-text-muted">Unitario</label>
                <CurrencyInput value={item.unit_price} onChange={(value) => updateItem(item.localId, { unit_price: value || 0 })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] app-text-muted">Desc.</label>
                <CurrencyInput value={item.discount} onChange={(value) => updateItem(item.localId, { discount: value || 0 })} />
              </div>
              <Input
                label="Imp. %"
                type="number"
                min="0"
                step="0.01"
                value={item.tax_rate}
                onChange={(event) => updateItem(item.localId, { tax_rate: Number(event.target.value) })}
              />
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] app-text-muted">Total linea</div>
                  <div className="app-inline-panel rounded-2xl px-3 py-3 text-sm font-semibold app-text">
                    {formatInvoiceMoney(buildLineTotal(item), activeBusiness?.currency || 'COP')}
                  </div>
                </div>
              </div>
            </div>
            {lineErrors[index] && (
              <div className="app-inline-panel-danger mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {lineErrors[index]}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="app-inline-panel-info grid gap-4 rounded-[24px] p-4 sm:grid-cols-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em]">Subtotal</div>
          <div className="mt-2 text-lg font-semibold">
            {formatInvoiceMoney(totals.subtotal, activeBusiness?.currency || 'COP')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em]">Descuentos</div>
          <div className="mt-2 text-lg font-semibold">
            {formatInvoiceMoney(totals.discountTotal, activeBusiness?.currency || 'COP')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em]">Impuestos</div>
          <div className="mt-2 text-lg font-semibold">
            {formatInvoiceMoney(totals.taxTotal, activeBusiness?.currency || 'COP')}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em]">Total</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {formatInvoiceMoney(totals.total, activeBusiness?.currency || 'COP')}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout data-tour="invoices.modal.form">
      <PageHeader
        title={isEditing ? `Editar ${selectedInvoice?.invoice_number || 'factura'}` : 'Nueva factura'}
        description="Editor profesional con vista previa en vivo, listo para desktop y para una captura rapida desde movil."
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={(
              <Button onClick={handleSubmit} isLoading={saving} disabled={isEditing && !editability.canEdit} className="w-full sm:w-auto" data-tour="invoices.modal.confirm">
                <Save className="h-4 w-4" /> Guardar
              </Button>
            )}
            secondary={[
              <Link key="back" to={selectedInvoice ? `/invoices/${selectedInvoice.id}` : '/invoices'} className="block w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4" /> {selectedInvoice ? 'Volver al detalle' : 'Cancelar'}
                </Button>
              </Link>,
              ...(selectedInvoice
                ? [
                    <Button key="duplicate" variant="secondary" onClick={handleDuplicateInvoice} className="w-full sm:w-auto">
                      <CopyPlus className="h-4 w-4" /> Duplicar
                    </Button>,
                  ]
                : []),
            ]}
          />
        )}
      />

      <PageBody className="app-canvas">
        <div className="space-y-5">
          {!isOfflineProductMode() && getInvoiceSyncMeta(selectedInvoice) && (
            <div className={`rounded-[24px] border px-4 py-4 text-sm ${selectedInvoice?.sync_status === 'failed' || selectedInvoice?.sync_status === 'conflicted'
              ? selectedInvoice?.sync_status === 'conflicted'
                ? 'app-inline-panel-conflict'
                : 'app-inline-panel-danger'
              : 'app-inline-panel-warning'}`}>
              {selectedInvoice?.sync_status === 'conflicted'
                ? 'Esta factura entró en conflicto con una versión más nueva del servidor. Revisa el centro de sync para decidir si reintentas o recuperas la versión confirmada.'
                : selectedInvoice?.sync_status === 'failed'
                ? 'Esta factura tiene cambios locales que no lograron sincronizarse. Puedes revisarla y volver a intentarlo cuando la conexion este disponible.'
                : 'Esta factura tiene cambios locales pendientes. Seguira disponible y se enviara al servidor cuando regrese la conexion.'}
            </div>
          )}

          {isEditing && !editability.canEdit && (
            <div className="app-inline-panel-warning flex items-start gap-3 rounded-[24px] px-4 py-4 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{editability.reason}</div>
            </div>
          )}

          {isMobile && (
            <div className="app-surface grid grid-cols-3 gap-2 rounded-[24px] p-2 shadow-sm">
              {[
                { id: 'basics' as MobileStep, label: 'Datos' },
                { id: 'items' as MobileStep, label: 'Lineas' },
                { id: 'preview' as MobileStep, label: 'Preview' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStep(tab.id)}
                  className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                    step === tab.id
                      ? 'app-segmented-option-active text-[color:var(--app-primary)] shadow-sm'
                      : 'app-text-secondary hover:bg-[color:var(--app-surface-soft)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {(loading && isEditing && !selectedInvoice) ? (
            <div className="app-surface rounded-[28px] p-10 text-center text-sm app-text-muted">
              Cargando factura...
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
              <div className="space-y-6">
                {(!isMobile || step === 'basics') && renderBasicsSection()}
                {(!isMobile || step === 'items') && renderItemsSection()}
              </div>

              {(!isMobile || step === 'preview') && (
                <div className="min-w-0 space-y-4">
                  <div className="app-surface rounded-[28px] p-4 shadow-sm">
                    <div className="app-muted-panel mb-4 flex flex-col gap-3 rounded-[24px] p-4">
                      <h2 className="text-lg font-semibold app-text">Vista previa en vivo</h2>
                      <p className="text-sm leading-6 app-text-muted">
                        Ajusta fechas, lineas y notas. El documento se actualiza al instante.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="app-surface rounded-2xl px-3 py-3 shadow-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] app-text-muted">Cliente</div>
                          <div className="mt-1 text-sm font-medium app-text">
                            {selectedCustomer?.name || 'Cliente ocasional'}
                          </div>
                        </div>
                        <div className="app-surface rounded-2xl px-3 py-3 shadow-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] app-text-muted">Estado</div>
                          <div className="mt-1 text-sm font-medium app-text">
                            {status === 'draft' ? 'Borrador' : status === 'sent' ? 'Enviada' : 'Cancelada'}
                          </div>
                        </div>
                        <div className="app-surface rounded-2xl px-3 py-3 shadow-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] app-text-muted">Total proyectado</div>
                          <div className="mt-1 text-sm font-semibold app-text">
                            {formatInvoiceMoney(totals.total, activeBusiness?.currency || 'COP')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <InvoiceDocumentPreview
                        business={activeBusiness}
                        customer={selectedCustomer}
                        invoice={previewInvoice}
                        settings={settings}
                        compact
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageBody>

      {isMobile && (
        <div className="app-page-header app-divider sticky bottom-0 z-30 border-t px-4 py-3 backdrop-blur">
          <Button className="w-full" onClick={handleSubmit} isLoading={saving} disabled={isEditing && !editability.canEdit}>
            <Save className="h-4 w-4" /> Guardar factura
          </Button>
        </div>
      )}
    </PageLayout>
  );
};
