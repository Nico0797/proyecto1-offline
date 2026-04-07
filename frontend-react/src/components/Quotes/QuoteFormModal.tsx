import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { useProductStore } from '../../store/productStore';
import { useAccess } from '../../hooks/useAccess';
import { Quote, QuoteItem, QuoteStatus } from '../../types';
import { formatCOP } from '../Sales/helpers';

interface QuoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    customer_id?: number | null;
    issue_date: string;
    expiry_date?: string | null;
    status?: QuoteStatus;
    discount?: number;
    notes?: string | null;
    terms?: string | null;
    items: Array<{
      product_id?: number | null;
      description: string;
      quantity: number;
      unit_price: number;
      sort_order?: number;
    }>;
  }) => Promise<void>;
  quote?: Quote | null;
  isSaving?: boolean;
}

type EditableQuoteItem = QuoteItem & {
  local_id: string;
};

const QUOTE_STATUS_OPTIONS: Array<{ value: QuoteStatus; label: string }> = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Vencida' },
];

const buildDefaultItem = (): EditableQuoteItem => ({
  local_id: Math.random().toString(36).slice(2),
  product_id: null,
  description: '',
  quantity: 1,
  unit_price: 0,
  subtotal: 0,
  sort_order: 0,
});

const toEditableItem = (item: QuoteItem, index: number): EditableQuoteItem => ({
  ...item,
  local_id: `${item.id || index}-${Math.random().toString(36).slice(2)}`,
  product_id: item.product_id ?? null,
  quantity: Number(item.quantity || 0),
  unit_price: Number(item.unit_price || 0),
  subtotal: Number(item.subtotal || 0),
  sort_order: item.sort_order ?? index,
});

export const QuoteFormModal = ({ isOpen, onClose, onSubmit, quote, isSaving = false }: QuoteFormModalProps) => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();
  const { hasModule, hasPermission } = useAccess();
  const canUseCustomers = hasModule('customers') && hasPermission('customers.view');
  const canUseProducts = hasModule('products') && hasPermission('products.view');

  const [customerId, setCustomerId] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('draft');
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<EditableQuoteItem[]>([buildDefaultItem()]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeBusiness) {
      if (canUseCustomers) {
        fetchCustomers(activeBusiness.id);
      }
      if (canUseProducts) {
        fetchProducts(activeBusiness.id);
      }
    }
  }, [isOpen, activeBusiness, canUseCustomers, canUseProducts]);

  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split('T')[0];
    setCustomerId(quote?.customer_id || '');
    setIssueDate(quote?.issue_date || today);
    setExpiryDate(quote?.expiry_date || '');
    setStatus(quote?.status && quote.status !== 'converted' ? quote.status : 'draft');
    setDiscount(Number(quote?.discount || 0));
    setNotes(quote?.notes || '');
    setTerms(quote?.terms || '');
    setItems(
      quote?.items?.length
        ? quote.items.map(toEditableItem)
        : [buildDefaultItem()]
    );
    setSubmitError(null);
  }, [isOpen, quote]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  }, [items]);

  const total = useMemo(() => {
    return Math.max(subtotal - discount, 0);
  }, [subtotal, discount]);

  const updateItem = (localId: string, updates: Partial<EditableQuoteItem>) => {
    setItems((current) => current.map((item) => {
      if (item.local_id !== localId) return item;
      const next = { ...item, ...updates };
      const quantity = Number(next.quantity || 0);
      const unitPrice = Number(next.unit_price || 0);
      next.subtotal = Math.max(quantity, 0) * Math.max(unitPrice, 0);
      return next;
    }));
  };

  const handleProductChange = (localId: string, rawValue: string) => {
    if (!rawValue) {
      updateItem(localId, { product_id: null });
      return;
    }
    const productId = Number(rawValue);
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    updateItem(localId, {
      product_id: product.id,
      description: product.name,
      unit_price: Number(product.price || 0),
    });
  };

  const addManualItem = () => {
    setItems((current) => [
      ...current,
      {
        ...buildDefaultItem(),
        sort_order: current.length,
      },
    ]);
  };

  const removeItem = (localId: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.local_id !== localId);
      return next.length ? next : [buildDefaultItem()];
    });
  };

  const handleSubmit = async () => {
    const normalizedItems = items
      .map((item, index) => ({
        product_id: item.product_id || null,
        description: String(item.description || '').trim(),
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        sort_order: index,
      }))
      .filter((item) => item.description || item.product_id);

    if (!issueDate) {
      setSubmitError('La fecha de emisión es requerida.');
      return;
    }

    if (normalizedItems.length === 0) {
      setSubmitError('Debes agregar al menos un item a la cotización.');
      return;
    }

    const invalidItem = normalizedItems.find((item) => !item.description || item.quantity <= 0 || item.unit_price < 0);
    if (invalidItem) {
      setSubmitError('Revisa los items: descripción obligatoria, cantidad > 0 y precio unitario >= 0.');
      return;
    }

    if (discount < 0 || discount > subtotal) {
      setSubmitError('El descuento no puede ser negativo ni mayor al subtotal.');
      return;
    }

    setSubmitError(null);
    try {
      await onSubmit({
        customer_id: customerId ? Number(customerId) : null,
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        status,
        discount,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items: normalizedItems,
      });
    } catch (error: any) {
      console.error(error);
      setSubmitError(error?.response?.data?.error || 'No se pudo guardar la cotización. Revisa la información e inténtalo nuevamente.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quote ? `Editar ${quote.quote_code}` : 'Nueva Cotización'}
      className="max-w-6xl h-[92vh]"
    >
      <div className="space-y-6">
        {submitError ? (
          <FormAlert
            tone="error"
            title="No fue posible guardar la cotización"
            message={submitError}
          />
        ) : null}

        <div className="rounded-[24px] border border-gray-200/80 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Contexto comercial</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Mantén la propuesta fácil de leer, fácil de convertir y cómoda de editar desde móvil.
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-tour="quotes.modal.context">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente</label>
            <select
              className="app-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Cliente casual / sin cliente</option>
              {canUseCustomers && customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emisión</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimiento</label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select
              className="app-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            >
              {QUOTE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento</label>
            <CurrencyInput value={discount} onChange={(value) => setDiscount(value || 0)} />
          </div>
          <div className="md:col-span-2 flex items-end">
            <div className="flex w-full items-center justify-between rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100/70 px-4 py-3 dark:border-blue-900/30 dark:from-blue-900/10 dark:via-gray-900 dark:to-blue-900/10">
              <div>
                <div className="text-xs text-blue-600 dark:text-blue-300 uppercase font-semibold">Total estimado</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCOP(total)}</div>
              </div>
              <div className="text-right text-xs text-blue-700 dark:text-blue-300">
                <div>Subtotal: {formatCOP(subtotal)}</div>
                <div>Descuento: {formatCOP(discount)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3" data-tour="quotes.modal.items">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Puedes mezclar productos del catálogo con conceptos libres.</p>
            </div>
            <Button variant="secondary" onClick={addManualItem}>
              <Plus className="w-4 h-4 mr-2" /> Agregar item
            </Button>
          </div>

          <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div key={item.local_id} className="grid grid-cols-1 gap-3 rounded-[24px] border border-gray-200 bg-gray-50/80 p-4 md:grid-cols-12 dark:border-gray-800 dark:bg-gray-950/60">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Producto opcional</label>
                  <select
                    className="app-select"
                    value={item.product_id || ''}
                    onChange={(e) => handleProductChange(item.local_id, e.target.value)}
                  >
                    <option value="">Concepto libre</option>
                    {canUseProducts && products.filter((product) => product.active).map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.local_id, { description: e.target.value })}
                    placeholder={`Item ${index + 1}`}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cant.</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.local_id, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Precio unitario</label>
                  <CurrencyInput value={item.unit_price} onChange={(value) => updateItem(item.local_id, { unit_price: value || 0 })} />
                </div>
                <div className="md:col-span-1 flex flex-col justify-end">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal</div>
                  <div className="h-10 flex items-center font-semibold text-gray-900 dark:text-white">{formatCOP(item.subtotal)}</div>
                </div>
                <div className="md:col-span-1 flex items-end justify-end">
                  <Button variant="secondary" onClick={() => removeItem(item.local_id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              className="min-h-[130px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas o contexto de la cotización..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Términos</label>
            <textarea
              className="min-h-[130px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Condiciones comerciales, vigencia, forma de entrega, etc."
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-3 sm:flex-row dark:border-gray-700">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSubmit} isLoading={isSaving} data-tour="quotes.modal.confirm">
            {quote ? 'Guardar cambios' : 'Crear cotización'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
