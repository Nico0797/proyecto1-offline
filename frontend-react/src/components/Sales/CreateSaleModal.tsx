import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { cn } from '../../utils/cn';
import { Search, X, ShoppingCart, DollarSign, ArrowRight, Check, Clock, ScanLine } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useCustomerStore } from '../../store/customerStore';
import { useProductStore } from '../../store/productStore';
import { useSaleStore } from '../../store/saleStore';
import { SaleItem, Product, Sale } from '../../types';
import { useBusinessStore } from '../../store/businessStore';
import { formatCOP } from './helpers';
import { useCategoryStore } from '../Products/categoryStore';
import { BarcodeScanner } from '../ui/BarcodeScanner';
import { toast } from 'react-hot-toast';
import { TreasuryAccountSelect } from '../Treasury/TreasuryAccountSelect';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';
import { SelectField } from '../ui/SelectField';
import { SearchableSelect } from '../ui/SearchableSelect';

export const CreateSaleModal = ({ isOpen, onClose, onSuccess, editingSale }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void; editingSale?: Sale | null }) => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();
  const { createSale, updateSale } = useSaleStore();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Items, 2: Customer, 3: Payment
  const [showScanner, setShowScanner] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productLimit, setProductLimit] = useState(24);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [saleDate, setSaleDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentType, setPaymentType] = useState<'paid' | 'credit' | 'partial'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [treasuryAccountId, setTreasuryAccountId] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showDiscountEditor, setShowDiscountEditor] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { categories, getCategory } = useCategoryStore();

  useEffect(() => {
    if (isOpen && activeBusiness) {
      fetchCustomers(activeBusiness.id);
      fetchProducts(activeBusiness.id);
      setStep(1);
      setProductSearch('');
      setProductLimit(24);
      setCategoryFilter('');
      if (editingSale) {
        const resolvedCollectedAmount = Number(editingSale.collected_amount || Math.max(Number(editingSale.total || 0) - Number(editingSale.balance || 0), 0));
        setSaleItems(Array.isArray(editingSale.items) ? editingSale.items : []);
        setSelectedCustomerId(editingSale.customer_id ?? '');
        setPaymentType(
          editingSale.paid
            ? 'paid'
            : resolvedCollectedAmount > 0.01
              ? 'partial'
              : 'credit'
        );
        setPaymentMethod(editingSale.payment_method || 'cash');
        setTreasuryAccountId(editingSale.treasury_account_id ?? null);
        setAmountPaid(resolvedCollectedAmount);
        setNote(editingSale.note || '');
        setDiscountType('amount');
        setDiscountValue(Number(editingSale.discount || 0));
        setShowDiscountEditor(Number(editingSale.discount || 0) > 0);
        setSaleDate(editingSale.sale_date ? String(editingSale.sale_date).split('T')[0] : new Date().toISOString().split('T')[0]);
      } else {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSaleDate(`${year}-${month}-${day}`);
        setSaleItems([]);
        setSelectedCustomerId('');
        setPaymentType('paid');
        setPaymentMethod('cash');
        setTreasuryAccountId(null);
        setAmountPaid(0);
        setNote('');
        setDiscountType('amount');
        setDiscountValue(0);
        setShowDiscountEditor(false);
      }
      setSubmitError(null);
    }
  }, [isOpen, activeBusiness, editingSale, fetchCustomers, fetchProducts]);

  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    const matchSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
    let matchCategory = true;
    if (categoryFilter) {
      const cat = getCategory(p.id);
      matchCategory = cat?.id === categoryFilter;
    }
    return matchSearch && matchCategory;
  });

  const handleAddItem = (product: Product) => {
    const existingItemIndex = saleItems.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      const newItems = [...saleItems];
      newItems[existingItemIndex].qty += 1;
      newItems[existingItemIndex].total = newItems[existingItemIndex].qty * newItems[existingItemIndex].unit_price;
      setSaleItems(newItems);
    } else {
      setSaleItems([...saleItems, {
        product_id: product.id,
        qty: 1,
        unit_price: product.price,
        name: product.name,
        total: product.price,
        fulfillment_mode: product.fulfillment_mode || (product.type === 'service' ? 'service' : undefined)
      }]);
    }
    setProductSearch('');
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newItems = [...saleItems];
    newItems[index].qty = quantity;
    newItems[index].total = newItems[index].unit_price * quantity;
    setSaleItems(newItems);
  };

  const handleUpdatePrice = (index: number, price: number) => {
      const newItems = [...saleItems];
      newItems[index].unit_price = price;
      newItems[index].total = newItems[index].qty * price;
      setSaleItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const calculateSubtotal = () => saleItems.reduce((sum, item) => sum + item.total, 0);
  const calculateDiscount = (subtotal: number) => {
    if (discountType === 'percent') {
      const pct = Math.min(Math.max(discountValue, 0), 100);
      return Math.round((subtotal * pct) / 100);
    }
    return Math.min(Math.max(discountValue, 0), subtotal);
  };

  const handleSubmit = async () => {
    if (!activeBusiness) return;
    
    // Validation
    if (saleItems.length === 0) {
      setSubmitError('Debes agregar al menos un producto o servicio antes de guardar la venta.');
      return;
    }
    if ((paymentType === 'credit' || paymentType === 'partial') && !selectedCustomerId) {
        setSubmitError('Para ventas fiadas o parciales debes seleccionar un cliente.');
        return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      const subtotal = calculateSubtotal();
      const discount = calculateDiscount(subtotal);
      const total = Math.max(subtotal - discount, 0);
      const finalPaid = paymentType === 'paid' ? total : (paymentType === 'credit' ? 0 : amountPaid);
      const isPaid = paymentType === 'paid';
      
      // Map payment method to backend expected values
      // Backend usually expects 'cash', 'transfer', 'credit' (as method string)
      // But we have split logic: isPaid boolean + method string.
      // Let's assume backend handles 'paid' boolean and 'payment_method' string.
      
      const payload = {
        customer_id: selectedCustomerId || null,
        items: saleItems,
        payment_method: paymentMethod,
        paid: isPaid,
        amount_paid: finalPaid,
        treasury_account_id: finalPaid > 0 ? treasuryAccountId : null,
        note,
        subtotal,
        discount,
        total,
        sale_date: saleDate,
      };

      if (editingSale) {
        await updateSale(activeBusiness.id, editingSale.id, {
          ...payload,
          customer_id: selectedCustomerId === '' ? undefined : selectedCustomerId,
        });
        toast.success('Venta actualizada');
      } else {
        await createSale(activeBusiness.id, payload);
        toast.success('Venta registrada');
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      const message = (error as any)?.response?.data?.error || (editingSale ? 'Error al actualizar la venta' : 'Error al crear la venta');
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const discount = calculateDiscount(subtotal);
  const total = Math.max(subtotal - discount, 0);
  const hasDiscount = discount > 0 || discountValue > 0;
  const hasRealPayment = (paymentType === 'paid' && total > 0) || (paymentType === 'partial' && amountPaid > 0);

  const handleScan = (code: string) => {
    setShowScanner(false);
    
    // Buscar en SKU O en la lista de barcodes (solo productos activos)
    const searchCode = code.toLowerCase().trim();
    const found = products.find(p => 
      p.active && (
        (p.sku && p.sku.toLowerCase() === searchCode) || 
        (p.barcodes && p.barcodes.some(b => b.toLowerCase() === searchCode))
      )
    );

    if (found) {
        handleAddItem(found);
        toast.success(`Añadido: ${found.name}`);
    } else {
        toast.error('Producto no encontrado', {
            duration: 4000,
        });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingSale ? `Editar venta #${editingSale.id}` : 'Registrar venta'} className="flex h-[92dvh] max-w-5xl flex-col">
      {/* Stepper Header */}
      <div className="app-stepper px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center justify-between">
          <div className={cn('flex items-center gap-2', step >= 1 ? 'text-[color:var(--app-primary)]' : 'app-text-muted')}>
              <div className={cn('app-step-node w-8 h-8 font-bold', step >= 1 ? 'app-step-node-complete' : '')}>1</div>
              <span className="font-medium hidden sm:inline">Productos</span>
          </div>
          <div className={cn('app-step-rail flex-1 mx-4', step >= 2 ? 'app-step-rail-active' : '')} />
          <div className={cn('flex items-center gap-2', step >= 2 ? 'text-[color:var(--app-primary)]' : 'app-text-muted')}>
              <div className={cn('app-step-node w-8 h-8 font-bold', step >= 2 ? 'app-step-node-complete' : '')}>2</div>
              <span className="font-medium hidden sm:inline">Cliente (opcional)</span>
          </div>
          <div className={cn('app-step-rail flex-1 mx-4', step >= 3 ? 'app-step-rail-active' : '')} />
          <div className={cn('flex items-center gap-2', step >= 3 ? 'text-[color:var(--app-primary)]' : 'app-text-muted')}>
              <div className={cn('app-step-node w-8 h-8 font-bold', step >= 3 ? 'app-step-node-complete' : '')}>3</div>
              <span className="font-medium hidden sm:inline">Pago</span>
          </div>
        </div>
        <div className="mt-2 text-center sm:hidden">
          <div className="text-[11px] uppercase tracking-wide app-text-muted">Paso {step} de 3</div>
          <div className="text-sm font-semibold app-text">{step === 1 ? 'Productos' : step === 2 ? 'Cliente' : 'Cobro'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6" data-tour="sales.modal.body">
        {submitError ? (
          <div className="mb-4 sm:mb-5">
            <FormAlert
              tone="error"
              title="No fue posible registrar la venta"
              message={submitError}
            />
          </div>
        ) : null}

        {step === 1 && (
            <div className="grid h-full grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 app-text-muted w-4 h-4" />
                            <Input
                                placeholder="Buscar productos o servicios..."
                                className="pl-10"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                autoFocus
                                data-tour="sales.modal.search"
                            />
                        </div>
                        <Button 
                            onClick={() => setShowScanner(true)}
                            className="px-3"
                            title="Escanear producto"
                        >
                            <ScanLine className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="app-inline-panel-info px-4 py-3.5 text-sm">
                      Busca o toca un producto para empezar.
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar -mt-1 pb-1">
                      <button
                        onClick={() => setCategoryFilter('')}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          categoryFilter === ''
                            ? 'app-segmented-option-active text-[color:var(--app-primary)] border-transparent shadow-sm'
                            : 'app-button-secondary'
                        }`}
                      >
                        Todas
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCategoryFilter(c.id)}
                          className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${
                            categoryFilter === c.id
                              ? 'app-segmented-option-active text-[color:var(--app-primary)] border-transparent shadow-sm'
                              : 'app-button-secondary'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-72 sm:max-h-80 overflow-y-auto overflow-x-visible pr-1 custom-scrollbar" data-tour="sales.modal.products">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 overflow-visible">
                        {filteredProducts.slice(0, productLimit).map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleAddItem(product)}
                            className="app-elevated-card relative flex flex-col gap-1 overflow-visible p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[color:var(--app-primary-soft-border)] hover:shadow-[var(--app-shadow-strong)] active:scale-[0.98]"
                          >
                            <div className="text-sm font-medium app-text truncate">{product.name}</div>
                            <div className="text-xs app-text-muted">Stock: {product.stock}</div>
                            <div className="mt-1 text-[color:var(--app-primary)] font-bold">{formatCOP(product.price)}</div>
                            <div className="app-button-primary mt-1.5 inline-flex items-center justify-center rounded-lg px-2 py-1 text-xs w-fit min-h-0">
                              Agregar
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="app-empty-state col-span-full px-4 py-6 text-center text-sm app-text-muted">
                            No encontramos productos con ese filtro. Borra la búsqueda o revisa tu catálogo.
                          </div>
                        )}
                      </div>
                      {filteredProducts.length > productLimit && (
                        <div className="flex justify-center mt-3">
                          <button
                            className="app-button-secondary px-4 py-2 text-sm rounded-lg"
                            onClick={() => setProductLimit(l => l + 24)}
                          >
                            Cargar más
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="app-inline-panel flex-1 overflow-y-auto rounded-[24px] p-3.5 sm:p-4" data-tour="sales.modal.cart">
                        {saleItems.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                              <TeachingEmptyState
                                compact
                                icon={ShoppingCart}
                                title="Todavía no has agregado productos"
                                description="Busca productos o toca una tarjeta para sumarlos a esta venta."
                                nextStep="Empieza con lo que el cliente te está comprando hoy."
                              />
                            </div>
                        ) : (
                            <div className="space-y-2.5 sm:space-y-3">
                                {saleItems.map((item, index) => (
                                    <div key={index} className="app-surface flex flex-col gap-3 rounded-[20px] p-3 sm:flex-row sm:items-center">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium app-text truncate">{item.name}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-xs app-text-muted">$</span>
                                                <input 
                                                    type="number"
                                                    className="text-sm text-[color:var(--app-primary)] bg-transparent border-none p-0 w-24 focus:ring-0 font-medium"
                                                    value={item.unit_price}
                                                    onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="app-muted-panel flex items-center rounded-lg shrink-0">
                                                <button 
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-[color:var(--app-surface-muted)] rounded-l-lg touch-manipulation app-text"
                                                    onClick={() => handleUpdateQuantity(index, item.qty - 1)}
                                                >-</button>
                                                <span className="w-8 text-center font-medium text-sm app-text">{item.qty}</span>
                                                <button 
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-[color:var(--app-surface-muted)] rounded-r-lg touch-manipulation app-text"
                                                    onClick={() => handleUpdateQuantity(index, item.qty + 1)}
                                                >+</button>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 sm:w-24 text-right font-bold app-text truncate">
                                                    {formatCOP(item.total)}
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="app-text-muted hover:text-[color:var(--app-danger)] transition-colors p-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="app-elevated-card h-fit overflow-hidden p-5 sm:p-6 xl:sticky xl:top-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold tracking-tight app-text sm:text-lg">Lo que llevas</h3>
                        <p className="mt-1 text-sm app-text-muted">
                          Un resumen claro antes de pasar a cliente y cobro.
                        </p>
                      </div>
                      <div className="app-status-chip app-status-chip-info inline-flex min-w-[72px] items-center justify-center px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                        {saleItems.length} item{saleItems.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="app-inline-panel mt-5 rounded-[26px] p-4 sm:p-5">
                      <div className="space-y-4 text-sm">
                        <div className="flex items-center justify-between gap-4 app-text-secondary">
                          <span>Subtotal</span>
                          <span className="font-semibold app-text">{formatCOP(subtotal)}</span>
                        </div>

                        <div className="app-surface rounded-[20px] p-3" data-tour="sales.modal.discount">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium app-text">Descuento</div>
                              <div className="mt-1 text-xs app-text-muted">
                                {hasDiscount
                                  ? discountType === 'percent'
                                    ? `${discountValue || 0}% aplicado`
                                    : 'Monto fijo aplicado'
                                  : 'Opcional para esta venta'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasDiscount ? (
                                <span className="app-status-chip app-status-chip-success px-2.5 py-1 text-xs font-semibold">
                                  -{formatCOP(discount)}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setShowDiscountEditor((value) => !value)}
                                className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-semibold"
                              >
                                {showDiscountEditor || hasDiscount ? 'Ocultar' : 'Agregar'}
                              </button>
                            </div>
                          </div>

                          {(showDiscountEditor || hasDiscount) && (
                            <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[108px_minmax(0,1fr)]">
                              <SelectField
                                aria-label="Tipo de descuento"
                                className="min-w-0 text-sm"
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                              >
                                <option value="amount">Monto</option>
                                <option value="percent">%</option>
                              </SelectField>
                              <div className="min-w-0">
                                <CurrencyInput
                                  className="h-11 min-w-0 text-right"
                                  value={discountValue}
                                  onChange={(val) => setDiscountValue(val || 0)}
                                  startAdornment={discountType === 'percent' ? '%' : '$'}
                                  placeholder="0"
                                />
                              </div>
                              {hasDiscount ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDiscountType('amount');
                                    setDiscountValue(0);
                                    setShowDiscountEditor(false);
                                  }}
                                  className="justify-self-start text-xs font-medium app-text-muted transition hover:text-[color:var(--app-text)] sm:col-span-2"
                                >
                                  Quitar descuento
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4 app-text-muted">
                          <span>Impuestos</span>
                          <span>$0</span>
                        </div>
                      </div>

                      <div className="app-surface mt-5 rounded-[22px] px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] app-text-muted">
                          Total a cobrar
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-4">
                          <span className="text-sm font-medium app-text-secondary">Venta actual</span>
                          <span className="text-2xl font-black tracking-tight app-text sm:text-[2rem]">
                            {formatCOP(total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button 
                        className="mt-5 w-full px-5 py-4 text-left" 
                        disabled={saleItems.length === 0}
                        onClick={() => setStep(2)}
                        data-tour="sales.modal.nextToClient"
                    >
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-base font-semibold leading-tight">Continuar</span>
                            <span className="mt-1 block text-sm text-blue-100/80">Cliente y cobro</span>
                          </span>
                          <ArrowRight className="h-5 w-5" />
                        </span>
                    </Button>
                </aside>
            </div>
        )}

        {step === 2 && (
             <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                 <div className="text-center mb-4 sm:mb-8">
                     <h2 className="text-xl sm:text-2xl font-bold app-text mb-2">¿A nombre de quién va la venta?</h2>
                     <p className="text-sm app-text-muted">Si quedará saldo pendiente, sí necesitas elegir cliente.</p>
                 </div>

                 <div className="space-y-4">
                     <div data-tour="sales.modal.clientSelect">
                       <SearchableSelect
                        label="Cliente"
                        helper="Puedes dejar la venta como mostrador o asignarla a un cliente para seguir saldo e historial."
                        sheetTitle="Seleccionar cliente"
                        searchPlaceholder="Buscar cliente por nombre o teléfono..."
                        placeholder="Cliente casual / venta de mostrador"
                        options={customers.map(c => ({ value: c.id, label: c.name, secondary: c.phone || undefined }))}
                        value={selectedCustomerId}
                        onChange={(v) => setSelectedCustomerId(v ? Number(v) : '')}
                       />
                     </div>
                     
                     {selectedCustomerId && (
                        <div className="app-inline-panel-info rounded-[22px] p-4" data-tour="sales.modal.clientInfo">
                            <p className="text-sm font-bold">Cliente seleccionado</p>
                            <p className="text-sm mt-1">
                              Este cliente ya tiene saldo pendiente de {formatCOP(customers.find(c => c.id === selectedCustomerId)?.balance || 0)}.
                            </p>
                        </div>
                     )}
                     
                     <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 pt-3 sm:pt-4">
                         <Button variant="secondary" className="flex-1 py-3" onClick={() => setStep(1)}>
                             Atrás
                         </Button>
                         <Button className="flex-1 py-3" onClick={() => setStep(3)} data-tour="sales.modal.nextToPayment">
                             Continuar al cobro
                         </Button>
                     </div>
                 </div>
             </div>
        )}

        {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                <div className="app-inline-panel-info mb-4 rounded-[24px] p-4 text-center sm:mb-6 sm:p-6">
                    <p className="text-sm uppercase font-bold tracking-wider mb-1">Total de esta venta</p>
                    <p className="text-3xl sm:text-4xl font-black">{formatCOP(total)}</p>
                </div>

                <div className="app-inline-panel rounded-[22px] px-4 py-3.5 text-sm">
                  Elige si hoy te pagan todo, dejan saldo pendiente o hacen un abono.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium app-text-secondary">Cómo te van a pagar</label>
                        <div className="flex flex-col gap-2" data-tour="sales.modal.paymentMethods">
                            <button  
                                className={`rounded-[22px] border px-4 py-3.5 text-left transition-all ${paymentType === 'paid' ? 'border-[color:var(--app-success)] bg-[color:var(--app-success-soft)] ring-1 ring-[color:var(--app-success)]' : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] hover:bg-[color:var(--app-surface-soft)]'}`}
                                onClick={() => { setPaymentType('paid'); setAmountPaid(total); }}
                            >
                                <div className="font-bold app-text flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Pago total hoy
                                </div>
                                <p className="text-xs app-text-muted mt-1">El cliente deja esta venta totalmente pagada.</p>
                            </button>

                            <button 
                                className={`rounded-[22px] border px-4 py-3.5 text-left transition-all ${paymentType === 'credit' ? 'border-[color:var(--app-danger)] bg-[color:var(--app-danger-soft)] ring-1 ring-[color:var(--app-danger)]' : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] hover:bg-[color:var(--app-surface-soft)]'}`}
                                onClick={() => { 
                                    if (!selectedCustomerId) {
                                        setSubmitError('Antes de dejar saldo pendiente debes seleccionar un cliente.');
                                        return;
                                    }
                                    setSubmitError(null);
                                    setPaymentType('credit'); 
                                    setAmountPaid(0); 
                                }}
                            >
                                <div className="font-bold app-text flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Dejar saldo pendiente
                                </div>
                                <p className="text-xs app-text-muted mt-1">La venta queda registrada y el cliente te debe después.</p>
                            </button>
                            
                            <button 
                                className={`rounded-[22px] border px-4 py-3.5 text-left transition-all ${paymentType === 'partial' ? 'border-[color:var(--app-warning)] bg-[color:var(--app-warning-soft)] ring-1 ring-[color:var(--app-warning)]' : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] hover:bg-[color:var(--app-surface-soft)]'}`}
                                onClick={() => { 
                                    if (!selectedCustomerId) {
                                        setSubmitError('Para recibir un abono primero debes seleccionar un cliente.');
                                        return;
                                    }
                                    setSubmitError(null);
                                    setPaymentType('partial'); 
                                    setAmountPaid(total / 2); 
                                }}
                            >
                                <div className="font-bold app-text flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Recibir un abono
                                </div>
                                <p className="text-xs app-text-muted mt-1">El cliente paga una parte y el resto queda pendiente.</p>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Input
                          label="Fecha de la venta"
                          type="date"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                        />

                        <label className="block text-sm font-medium app-text-secondary">Cómo entra el dinero</label>
                        <SelectField
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="cash">Efectivo</option>
                            <option value="nequi">Nequi</option>
                            <option value="daviplata">Daviplata</option>
                            <option value="bancolombia">Bancolombia</option>
                            <option value="card">Tarjeta</option>
                            <option value="transfer">Transferencia</option>
                            <option value="other">Otro</option>
                        </SelectField>

                        {paymentType === 'partial' && (
                             <div>
                                 <label className="block text-sm font-medium app-text-secondary mb-1">Monto a abonar hoy</label>
                                 <CurrencyInput 
                                    value={amountPaid}
                                    onChange={(val) => setAmountPaid(val || 0)}
                                    max={total}
                                 />
                                 <p className="app-inline-panel-warning mt-2 rounded-xl px-3 py-2 text-xs font-medium">Quedan debiendo: {formatCOP(total - amountPaid)}</p>
                             </div>
                        )}

                        {hasRealPayment ? (
                          <TreasuryAccountSelect
                            businessId={activeBusiness?.id}
                            value={treasuryAccountId}
                            onChange={(value: number | null) => setTreasuryAccountId(value)}
                            helperText="Elige dónde entra el dinero de esta venta pagada o abono inicial."
                          />
                        ) : null}
                        
                        <div>
                             <label className="block text-sm font-medium app-text-secondary mb-1">Nota interna (opcional)</label>
                             <textarea 
                                className="app-textarea min-h-[96px]"
                                placeholder="Ej. Pagó por transferencia y pidió factura"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                             />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 border-t app-divider pt-5 sm:mt-8 sm:flex-row sm:gap-4">
                    <Button variant="secondary" className="flex-1 py-3" onClick={() => setStep(2)}>
                        Atrás
                    </Button>
                    <Button 
                        className="flex-1 py-3 text-base sm:text-lg" 
                        onClick={handleSubmit}
                        isLoading={loading}
                        data-tour="sales.modal.confirm"
                    >
                        {editingSale ? 'Guardar cambios' : 'Guardar venta'}
                    </Button>
                </div>
            </div>
        )}
      </div>
      {showScanner && (
        <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
        />
      )}
    </Modal>
  );
};
