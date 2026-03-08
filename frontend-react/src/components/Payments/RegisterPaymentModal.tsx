import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { useSaleStore } from '../../store/saleStore';
import { usePaymentStore } from '../../store/paymentStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getUnpaidInvoices, allocatePayment } from '../../utils/receivables.compute';
import { Search, User, DollarSign, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomerId?: number;
}

const STEPS = [
  { id: 1, title: 'Cliente' },
  { id: 2, title: 'Detalles' },
  { id: 3, title: 'Aplicación' },
  { id: 4, title: 'Confirmar' }
];

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId
}) => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { sales, fetchSales } = useSaleStore();
  const { createPayment } = usePaymentStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form Data
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [note, setNote] = useState('');
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
  const [manualAllocation, setManualAllocation] = useState<Map<number, number>>(new Map());

  // Derived Data
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const unpaidInvoices = useMemo(() => 
    selectedCustomerId ? getUnpaidInvoices(sales, selectedCustomerId) : [],
  [sales, selectedCustomerId]);

  // const totalDebt = useMemo(() => unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0), [unpaidInvoices]);

  // Effects
  useEffect(() => {
    if (isOpen && activeBusiness) {
      fetchCustomers(activeBusiness.id);
      fetchSales(activeBusiness.id);
      setStep(1);
      setSearchTerm('');
      setAmount('');
      setMethod('cash');
      setNote('');
      setManualAllocation(new Map());
      
      if (initialCustomerId) {
        setSelectedCustomerId(initialCustomerId);
        setStep(2);
      } else {
        setSelectedCustomerId(null);
      }
    }
  }, [isOpen, activeBusiness, initialCustomerId]);

  // Compute Allocation
  const currentAllocation = useMemo(() => {
    const payAmount = parseFloat(amount) || 0;
    if (allocationMode === 'auto') {
      return allocatePayment(payAmount, unpaidInvoices);
    } else {
      return manualAllocation;
    }
  }, [amount, unpaidInvoices, allocationMode, manualAllocation]);

  const allocatedTotal = useMemo(() => {
    let sum = 0;
    currentAllocation.forEach(val => sum += val);
    return sum;
  }, [currentAllocation]);

  const remainingAmount = (parseFloat(amount) || 0) - allocatedTotal;

  // Handlers
  const handleNext = () => {
    if (step === 1 && !selectedCustomerId) return;
    if (step === 2 && (!amount || parseFloat(amount) <= 0)) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleManualAllocate = (invoiceId: number, value: string) => {
    const val = parseFloat(value) || 0;
    const invoice = unpaidInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Limit to invoice balance
    const validVal = Math.min(val, invoice.balance);
    
    setManualAllocation(prev => {
      const next = new Map(prev);
      if (validVal > 0) {
        next.set(invoiceId, validVal);
      } else {
        next.delete(invoiceId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!activeBusiness || !selectedCustomerId) return;
    
    setLoading(true);
    try {
      // Create payment
      // Note: Backend might not support explicit allocation array yet in /payments endpoint
      // based on previous analysis of models.py (Payment model has single sale_id).
      // If we want to support multi-invoice allocation, we might need to create multiple payments
      // or just create one payment and let backend handle FIFO logic if implemented,
      // OR store just the customer payment and handle allocation locally for display.
      // Given the constraints "No rompas endpoints", and Payment model has `sale_id`,
      // it seems strictly 1 payment -> 1 sale OR 1 payment -> null (account credit).
      
      // Strategy: 
      // If auto/manual allocation covers multiple invoices, we technically should create multiple payment records 
      // OR create one payment with null sale_id and let a backend process handle it.
      // However, to keep it simple and consistent with "Register Payment" basic flow:
      // We will create ONE payment. If it matches exactly one invoice or we want to link it to the oldest, 
      // we can pass sale_id. But if it splits, we can't link to multiple sale_ids in one record.
      
      // Compromise: Create one payment for the total amount linked to the customer.
      // In the note, we can mention allocation.
      // Ideally, we loop and create multiple payments if we want strict linking, but that spams the transaction log.
      // Let's just send the payment for the customer.
      
      await createPayment(activeBusiness.id, {
        customer_id: selectedCustomerId,
        amount: parseFloat(amount),
        method,
        note: note + (allocationMode === 'manual' ? ' [Manual Allocation]' : ''),
        payment_date: date
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render Steps
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="relative" data-tour="payments.modal.clientSearch">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar cliente..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>
      
      <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800" data-tour="payments.modal.clientList">
        {customers
          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedCustomerId(c.id)}
              className={cn(
                "p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                selectedCustomerId === c.id && "bg-blue-50 dark:bg-blue-900/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-500">Deuda: ${c.balance.toLocaleString()}</p>
                </div>
              </div>
              {selectedCustomerId === c.id && <CheckCircle className="w-5 h-5 text-blue-500" />}
            </div>
          ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center">
        <span className="text-sm text-gray-500">Cliente seleccionado:</span>
        <span className="font-bold text-gray-900 dark:text-white">{selectedCustomer?.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-4" data-tour="payments.modal.details">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="number"
              className="pl-10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
        <select
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="cash">Efectivo</option>
          <option value="nequi">Nequi</option>
          <option value="daviplata">Daviplata</option>
          <option value="bancolombia">Bancolombia</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota / Referencia</label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej. Abono parcial factura #123"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Aplicar a Facturas</h4>
        <div className="flex gap-2 text-xs">
          <button 
            onClick={() => setAllocationMode('auto')}
            className={cn("px-2 py-1 rounded", allocationMode === 'auto' ? "bg-blue-100 text-blue-700" : "text-gray-500")}
          >
            Automático
          </button>
          <button 
            onClick={() => setAllocationMode('manual')}
            className={cn("px-2 py-1 rounded", allocationMode === 'manual' ? "bg-blue-100 text-blue-700" : "text-gray-500")}
          >
            Manual
          </button>
        </div>
      </div>

      {unpaidInvoices.length === 0 ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 text-sm">
          Este cliente no tiene facturas pendientes. El pago quedará como saldo a favor.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {unpaidInvoices.map((inv) => {
            const allocated = currentAllocation.get(inv.id) || 0;
            
            return (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Venta #{inv.id}</span>
                    {inv.isOverdue && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Vencida</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(inv.saleDate).toLocaleDateString()} • Saldo: ${inv.balance.toLocaleString()}
                  </div>
                </div>
                
                <div className="w-32">
                  {allocationMode === 'auto' ? (
                    <div className={cn("text-right font-medium", allocated > 0 ? "text-green-600" : "text-gray-400")}>
                      ${allocated.toLocaleString()}
                    </div>
                  ) : (
                    <Input
                      type="number"
                      className="h-8 text-right text-sm"
                      value={allocated || ''}
                      onChange={(e) => handleManualAllocate(inv.id, e.target.value)}
                      placeholder="0"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-500">Monto del Pago:</span>
        <span className="font-bold text-gray-900 dark:text-white">${parseFloat(amount || '0').toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">Asignado:</span>
        <span className="font-bold text-green-600">${allocatedTotal.toLocaleString()}</span>
      </div>
      {remainingAmount !== 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{remainingAmount > 0 ? 'Por asignar (Saldo a favor):' : 'Excedido:'}</span>
          <span className={cn("font-bold", remainingAmount > 0 ? "text-blue-500" : "text-red-500")}>
            ${Math.abs(remainingAmount).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-4 space-y-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Pago</h3>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Cliente:</span>
          <span className="font-medium text-gray-900 dark:text-white">{selectedCustomer?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Monto:</span>
          <span className="font-bold text-green-600 text-lg">${parseFloat(amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Método:</span>
          <span className="capitalize text-gray-900 dark:text-white">{method === 'transfer' ? 'Transferencia' : 'Efectivo'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fecha:</span>
          <span className="text-gray-900 dark:text-white">{new Date(date).toLocaleDateString()}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Se registrará este pago y se actualizarán los saldos correspondientes.
      </p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago"
      className="max-w-lg"
    >
      <div className="flex items-center justify-between mb-6 px-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step >= s.id 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 dark:bg-gray-700 text-gray-500"
            )}>
              {s.id}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 w-8 mx-2",
                step > s.id ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="min-h-[300px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          onClick={step === 1 ? onClose : handleBack}
          disabled={loading}
        >
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </Button>
        
        {step < 4 ? (
          <Button 
            onClick={handleNext}
            disabled={
              (step === 1 && !selectedCustomerId) || 
              (step === 2 && (!amount || parseFloat(amount) <= 0))
            }
            data-tour="payments.modal.next"
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            className="bg-green-600 hover:bg-green-700 text-white border-none"
            disabled={loading}
            data-tour="payments.modal.confirm"
          >
            {loading ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        )}
      </div>
    </Modal>
  );
};
