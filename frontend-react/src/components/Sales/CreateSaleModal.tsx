import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Search, X, ShoppingCart, DollarSign, ArrowRight, Check, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useCustomerStore } from '../../store/customerStore';
import { useProductStore } from '../../store/productStore';
import { useSaleStore } from '../../store/saleStore';
import { SaleItem, Product } from '../../types';
import { useBusinessStore } from '../../store/businessStore';
import { formatCOP } from './helpers';
import { useCategoryStore } from '../Products/categoryStore';

export const CreateSaleModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();
  const { createSale } = useSaleStore();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Items, 2: Customer, 3: Payment
  const [productSearch, setProductSearch] = useState('');
  const [productLimit, setProductLimit] = useState(24);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [saleDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentType, setPaymentType] = useState<'paid' | 'credit' | 'partial'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const { categories, getCategory } = useCategoryStore();

  useEffect(() => {
    if (isOpen && activeBusiness) {
      fetchCustomers(activeBusiness.id);
      fetchProducts(activeBusiness.id);
      setStep(1);
      setSaleItems([]);
      setSelectedCustomerId('');
      setPaymentType('paid');
      setAmountPaid(0);
      setNote('');
    }
  }, [isOpen, activeBusiness]);

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
        total: product.price
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
    if (saleItems.length === 0) return;
    if ((paymentType === 'credit' || paymentType === 'partial') && !selectedCustomerId) {
        alert('Para ventas fiadas o parciales debes seleccionar un cliente.');
        return;
    }

    setLoading(true);
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
      
      await createSale(activeBusiness.id, {
        customer_id: selectedCustomerId || null,
        items: saleItems,
        payment_method: paymentMethod, 
        paid: isPaid,
        amount_paid: finalPaid, // Backend should handle balance calculation: total - amount_paid
        note: note,
        subtotal,
        discount,
        total,
        sale_date: saleDate
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al crear la venta');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const discount = calculateDiscount(subtotal);
  const total = Math.max(subtotal - discount, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Venta" className="max-w-4xl h-[90vh] flex flex-col">
      {/* Stepper Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>1</div>
              <span className="font-medium hidden sm:inline">Productos</span>
          </div>
          <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>2</div>
              <span className="font-medium hidden sm:inline">Cliente</span>
          </div>
          <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>3</div>
              <span className="font-medium hidden sm:inline">Pago</span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6" data-tour="sales.modal.body">
        {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar productos o servicios..."
                            className="pl-10"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            autoFocus
                            data-tour="sales.modal.search"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar -mt-1 pb-1">
                      <button
                        onClick={() => setCategoryFilter('')}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          categoryFilter === ''
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
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
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-80 overflow-y-auto overflow-x-visible pr-1 custom-scrollbar" data-tour="sales.modal.products">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-visible">
                        {filteredProducts.slice(0, productLimit).map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleAddItem(product)}
                            className="relative overflow-visible p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md active:scale-[0.98] transition-all text-left flex flex-col gap-1"
                          >
                            <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Stock: {product.stock}</div>
                            <div className="mt-1 text-blue-600 dark:text-blue-400 font-bold">{formatCOP(product.price)}</div>
                            <div className="mt-2 inline-flex items-center justify-center px-2 py-1 rounded-lg bg-blue-600 text-white text-xs w-fit">
                              Agregar
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="col-span-full text-center text-gray-500 py-6">No se encontraron productos</div>
                        )}
                      </div>
                      {filteredProducts.length > productLimit && (
                        <div className="flex justify-center mt-3">
                          <button
                            className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            onClick={() => setProductLimit(l => l + 24)}
                          >
                            Cargar más
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto" data-tour="sales.modal.cart">
                        {saleItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <ShoppingCart className="w-12 h-12 mb-2" />
                                <p>El carrito está vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {saleItems.map((item, index) => (
                                    <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                            <input 
                                                type="number"
                                                className="text-sm text-blue-600 bg-transparent border-none p-0 w-24 focus:ring-0 font-medium"
                                                value={item.unit_price}
                                                onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                            <button 
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-lg"
                                                onClick={() => handleUpdateQuantity(index, item.qty - 1)}
                                            >-</button>
                                            <span className="w-8 text-center font-medium text-sm">{item.qty}</span>
                                            <button 
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-lg"
                                                onClick={() => handleUpdateQuantity(index, item.qty + 1)}
                                            >+</button>
                                        </div>
                                        <div className="w-24 text-right font-bold text-gray-900 dark:text-white">
                                            {formatCOP(item.total)}
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Resumen</h3>
                    <div className="space-y-3 text-sm mb-6">
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Subtotal</span>
                          <span>{formatCOP(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2" data-tour="sales.modal.discount">
                        <span className="text-gray-500 dark:text-gray-400">Descuento</span>
                        <div className="flex items-center gap-2">
                          <select
                            className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                          >
                            <option value="amount">$</option>
                            <option value="percent">%</option>
                          </select>
                          <input
                            type="number"
                            className="w-24 px-2 py-1 text-right rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                            value={discountValue}
                            min={0}
                            max={discountType === 'percent' ? 100 : subtotal}
                            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Impuestos</span>
                          <span>$0</span>
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2 flex justify-between font-bold text-xl text-gray-900 dark:text-white">
                          <span>Total</span>
                          <span>{formatCOP(total)}</span>
                      </div>
                    </div>
                    <Button 
                        className="w-full py-3 text-lg" 
                        disabled={saleItems.length === 0}
                        onClick={() => setStep(2)}
                        data-tour="sales.modal.nextToClient"
                    >
                        Continuar <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        )}

        {step === 2 && (
             <div className="max-w-2xl mx-auto space-y-6">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Seleccionar Cliente</h2>
                     <p className="text-gray-500 dark:text-gray-400">Asigna la venta a un cliente (opcional para ventas de contado).</p>
                 </div>

                 <div className="space-y-4">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                         Buscar Cliente
                     </label>
                     <div data-tour="sales.modal.clientSelect">
                     <select
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                        autoFocus
                     >
                        <option value="">-- Cliente Casual / Mostrador --</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                        ))}
                     </select>
                     </div>
                     
                     {selectedCustomerId && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800" data-tour="sales.modal.clientInfo">
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Información del Cliente</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Saldo pendiente: {formatCOP(customers.find(c => c.id === selectedCustomerId)?.balance || 0)}</p>
                        </div>
                     )}
                     
                     <div className="flex gap-4 pt-4">
                         <Button variant="secondary" className="flex-1 py-3" onClick={() => setStep(1)}>
                             Atrás
                         </Button>
                         <Button className="flex-1 py-3" onClick={() => setStep(3)} data-tour="sales.modal.nextToPayment">
                             Continuar al Pago
                         </Button>
                     </div>
                 </div>
             </div>
        )}

        {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl text-center mb-6">
                    <p className="text-sm text-blue-600 dark:text-blue-300 uppercase font-bold tracking-wider mb-1">Total a Pagar</p>
                    <p className="text-4xl font-black text-blue-900 dark:text-blue-100">{formatCOP(total)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Pago</label>
                        <div className="flex flex-col gap-2" data-tour="sales.modal.paymentMethods">
                            <button  
                                className={`p-4 rounded-xl border text-left transition-all ${paymentType === 'paid' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                onClick={() => { setPaymentType('paid'); setAmountPaid(total); }}
                            >
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Contado (Pagada)
                                </div>
                                <p className="text-xs text-gray-500 mt-1">El cliente paga el total ahora.</p>
                            </button>

                            <button 
                                className={`p-4 rounded-xl border text-left transition-all ${paymentType === 'credit' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                onClick={() => { 
                                    if (!selectedCustomerId) {
                                        alert('Debes seleccionar un cliente en el paso anterior para fiar.');
                                        return;
                                    }
                                    setPaymentType('credit'); 
                                    setAmountPaid(0); 
                                }}
                            >
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Fiado (Crédito)
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Se genera una cuenta por cobrar.</p>
                            </button>
                            
                            <button 
                                className={`p-4 rounded-xl border text-left transition-all ${paymentType === 'partial' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                onClick={() => { 
                                    if (!selectedCustomerId) {
                                        alert('Debes seleccionar un cliente para pago parcial.');
                                        return;
                                    }
                                    setPaymentType('partial'); 
                                    setAmountPaid(total / 2); 
                                }}
                            >
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Pago Parcial (Abono)
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Paga una parte, debe el resto.</p>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Método</label>
                        <div className="grid grid-cols-2 gap-2">
                             <button
                                className={`p-3 rounded-lg border text-center text-sm font-medium ${paymentMethod === 'cash' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                onClick={() => setPaymentMethod('cash')}
                             >
                                 Efectivo
                             </button>
                             <button
                                className={`p-3 rounded-lg border text-center text-sm font-medium ${paymentMethod === 'transfer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                onClick={() => setPaymentMethod('transfer')}
                             >
                                 Transferencia
                             </button>
                             <button
                                className={`p-3 rounded-lg border text-center text-sm font-medium ${paymentMethod === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                onClick={() => setPaymentMethod('card')}
                             >
                                 Tarjeta
                             </button>
                        </div>

                        {paymentType === 'partial' && (
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a abonar hoy</label>
                                 <Input 
                                    type="number"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                    max={total}
                                 />
                                 <p className="text-xs text-red-500 mt-1 font-medium">Quedan debiendo: {formatCOP(total - amountPaid)}</p>
                             </div>
                        )}
                        
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                             <textarea 
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none text-sm"
                                placeholder="Notas internas..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                             />
                        </div>
                        
                        <div className="mt-4" data-tour="sales.modal.receipt">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" className="rounded text-blue-600" />
                                Enviar recibo por WhatsApp
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-8">
                    <Button variant="secondary" className="flex-1 py-3" onClick={() => setStep(2)}>
                        Atrás
                    </Button>
                    <Button 
                        className="flex-1 py-3 text-lg shadow-lg shadow-blue-500/30" 
                        onClick={handleSubmit}
                        isLoading={loading}
                        data-tour="sales.modal.confirm"
                    >
                        Confirmar Venta
                    </Button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};
