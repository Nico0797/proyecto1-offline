import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useProductStore } from '../../store/productStore';
import { useCustomerStore } from '../../store/customerStore';
import { useOrderStore, OrderItem } from '../../store/orderStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Search, ShoppingCart, ArrowRight, X } from 'lucide-react';
import { Product } from '../../types';
import { formatCOP } from './helpers';
import { useCategoryStore } from '../Products/categoryStore';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { products, fetchProducts } = useProductStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { createOrder } = useOrderStore();

  const [step, setStep] = useState<1 | 2>(1); // 1: Items, 2: Details
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState<'pending' | 'completed' | 'cancelled'>('pending');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productLimit, setProductLimit] = useState(24);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const { categories, getCategory } = useCategoryStore();

  useEffect(() => {
    if (activeBusiness && isOpen) {
      fetchProducts(activeBusiness.id);
      fetchCustomers(activeBusiness.id);
      setStep(1);
    }
  }, [activeBusiness, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrderItems([]);
      setSelectedCustomerId('');
      setStatus('pending');
      setNote('');
      setProductSearch('');
      setStep(1);
    }
  }, [isOpen]);

  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    const matchesSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
    let matchesCategory = true;
    if (categoryFilter) {
      const cat = getCategory(p.id);
      matchesCategory = cat?.id === categoryFilter;
    }
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (product: Product) => {
    const existingItemIndex = orderItems.findIndex((item) => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      const newItems = [...orderItems];
      const item = newItems[existingItemIndex];
      item.quantity += 1;
      item.total = item.quantity * item.unit_price;
      setOrderItems(newItems);
    } else {
      setOrderItems([
        ...orderItems,
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.price,
          total: product.price,
        },
      ]);
    }
    setProductSearch('');
    
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: number) => {
    const newItems = [...orderItems];
    const item = newItems[index];
    
    if (field === 'quantity') {
      item.quantity = Math.max(1, value);
    } else if (field === 'unit_price') {
      item.unit_price = Math.max(0, value);
    }
    
    item.total = item.quantity * item.unit_price;
    setOrderItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    if (!activeBusiness) return;
    if (orderItems.length === 0) return;

    setLoading(true);
    try {
      const itemsPayload = orderItems.map(it => ({
        product_id: it.product_id,
        name: it.name,
        quantity: it.quantity,
        qty: it.quantity, // compat
        unit_price: it.unit_price,
        price: it.unit_price, // compat
        total: it.total ?? (it.quantity * it.unit_price),
      }));
      const computedTotal = itemsPayload.reduce((s, it) => s + (it.total ?? (it.quantity * it.unit_price)), 0);
      await createOrder(activeBusiness.id, {
        customer_id: selectedCustomerId || null,
        items: itemsPayload,
        total: computedTotal,
        subtotal: computedTotal,
        status,
        note,
        order_date: orderDate
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Pedido"
      className="max-w-4xl h-[90vh] flex flex-col"
    >
      {/* Stepper Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>1</div>
              <span className="font-medium hidden sm:inline">Productos</span>
          </div>
          <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>2</div>
              <span className="font-medium hidden sm:inline">Detalles</span>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
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
                            data-tour="orders.modal.search"
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
                    <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar" data-tour="orders.modal.products">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredProducts.slice(0, productLimit).map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleAddItem(product)}
                            className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md active:scale-[0.98] transition-all text-left flex flex-col gap-1"
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
                            onClick={() => setProductLimit((l) => l + 24)}
                          >
                            Cargar más
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto" data-tour="orders.modal.cart">
                        {orderItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <ShoppingCart className="w-12 h-12 mb-2" />
                                <p>El pedido está vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {orderItems.map((item, index) => (
                                    <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                            <input 
                                                type="number"
                                                className="text-sm text-blue-600 bg-transparent border-none p-0 w-24 focus:ring-0 font-medium"
                                                value={item.unit_price}
                                                onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                            <button 
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-lg"
                                                onClick={() => handleUpdateItem(index, 'quantity', item.quantity - 1)}
                                            >-</button>
                                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                            <button 
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-lg"
                                                onClick={() => handleUpdateItem(index, 'quantity', item.quantity + 1)}
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
                    <div className="space-y-2 text-sm mb-6">
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCOP(calculateTotal())}</span>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-2 pt-2 flex justify-between font-bold text-xl text-gray-900 dark:text-white">
                            <span>Total</span>
                            <span>{formatCOP(calculateTotal())}</span>
                        </div>
                    </div>
                    <Button 
                        className="w-full py-3 text-lg font-bold shadow-lg shadow-blue-500/20"
                        disabled={orderItems.length === 0}
                        onClick={() => setStep(2)}
                        data-tour="orders.modal.next"
                    >
                        Continuar <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        )}

        {step === 2 && (
             <div className="max-w-2xl mx-auto space-y-6">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Detalles del Pedido</h2>
                     <p className="text-gray-500 dark:text-gray-400">Asigna el cliente y la información final.</p>
                 </div>

                 <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                     <div data-tour="orders.modal.client">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cliente *
                        </label>
                        <select
                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                            autoFocus
                        >
                            <option value="">-- Seleccionar Cliente --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                            ))}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha de Pedido
                            </label>
                            <Input
                                type="date"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Estado Inicial
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                            >
                                <option value="pending">Pendiente</option>
                                <option value="completed">Completado</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                         <textarea 
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-sm"
                            placeholder="Instrucciones especiales, fecha de entrega, etc..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                         />
                     </div>
                     
                     <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                         <Button variant="secondary" className="flex-1 py-3" onClick={() => setStep(1)}>
                             Atrás
                         </Button>
                         <Button className="flex-1 py-3" onClick={handleSubmit} isLoading={loading}>
                             Confirmar Pedido
                         </Button>
                     </div>
                 </div>
             </div>
        )}
      </div>
    </Modal>
  );
};
