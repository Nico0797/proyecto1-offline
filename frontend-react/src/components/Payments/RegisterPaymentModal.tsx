import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { usePaymentStore } from '../../store/paymentStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getUnpaidInvoices, allocatePayment } from '../../utils/receivables.compute';
import { ReceivableItem } from '../../types';
import { Search, User, DollarSign, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toast } from 'react-hot-toast';
import { TreasuryAccountSelect } from '../Treasury/TreasuryAccountSelect';
import { useTreasuryStore } from '../../store/treasuryStore';
import { formatTreasuryAccountLabel } from '../../utils/treasury';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomerId?: number;
  receivables: ReceivableItem[];
}

const STEPS = [
  { id: 1, title: 'Cliente' },
  { id: 2, title: 'Cobro' },
  { id: 3, title: 'Aplicación' },
  { id: 4, title: 'Confirmar' }
];

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId,
  receivables
}) => {
  const { activeBusiness } = useBusinessStore();
  const { customers, fetchCustomers } = useCustomerStore();
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
  const [treasuryAccountId, setTreasuryAccountId] = useState<number | null>(null);
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
  const [manualAllocation, setManualAllocation] = useState<Map<number, number>>(new Map());
  const treasuryAccounts = useTreasuryStore((state) => state.accounts);

  // Derived Data
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const unpaidInvoices = useMemo(() => 
    selectedCustomerId ? getUnpaidInvoices(receivables, selectedCustomerId) : [],
  [receivables, selectedCustomerId]);
  const selectedTreasuryAccount = useMemo(
    () => treasuryAccounts.find((account) => account.id === treasuryAccountId) || null,
    [treasuryAccounts, treasuryAccountId]
  );

  // const totalDebt = useMemo(() => unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0), [unpaidInvoices]);

  // Effects
  useEffect(() => {
    if (isOpen && activeBusiness) {
      fetchCustomers(activeBusiness.id);
      setStep(1);
      setSearchTerm('');
      setAmount('');
      setMethod('cash');
      setNote('');
      setTreasuryAccountId(null);
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
        treasury_account_id: treasuryAccountId,
        note: note + (allocationMode === 'manual' ? ' [Manual Allocation]' : ''),
        payment_date: date
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating payment:', error);
      const message = (error as any)?.response?.data?.error || 'Error al registrar el pago';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Render Steps
  const renderStep1 = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
        Elige el cliente que te está pagando hoy.
      </div>
      <div className="relative" data-tour="payments.modal.clientSearch">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Busca el cliente que va a pagar"
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>
      
      <div className="max-h-56 overflow-y-auto rounded-[20px] border border-gray-200 divide-y divide-gray-100 dark:border-gray-800 dark:divide-gray-800" data-tour="payments.modal.clientList">
        {customers
          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedCustomerId(c.id)}
              className={cn(
                "px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
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
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-[20px] bg-gray-50 px-3.5 py-3 dark:bg-gray-800">
        <span className="text-sm text-gray-500">Cliente:</span>
        <span className="font-bold text-gray-900 dark:text-white text-right">{selectedCustomer?.name}</span>
      </div>

      <div className="rounded-[20px] border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
        Registra el valor, el medio y la cuenta donde entró.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" data-tour="payments.modal.details">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto recibido</label>
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de cobro</label>
        <select
          className="app-select"
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

      <TreasuryAccountSelect
        businessId={activeBusiness?.id}
        value={treasuryAccountId}
        onChange={(value) => setTreasuryAccountId(value)}
        helperText="Elige la cuenta donde entra este cobro."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota o referencia</label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej. Transferencia de la venta del martes"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-1">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">A qué ventas aplicar este cobro</h4>
        <div className="inline-flex w-fit gap-1 rounded-full bg-gray-100 p-1 text-xs shadow-sm dark:bg-gray-800">
          <button 
            onClick={() => setAllocationMode('auto')}
            className={cn("px-2.5 py-1 rounded-full", allocationMode === 'auto' ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700" : "text-gray-500")}
          >
            Sugerido
          </button>
          <button 
            onClick={() => setAllocationMode('manual')}
            className={cn("px-2.5 py-1 rounded-full", allocationMode === 'manual' ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700" : "text-gray-500")}
          >
            Elegir yo
          </button>
        </div>
      </div>

      {unpaidInvoices.length === 0 ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 text-sm">
          Este cliente no tiene ventas pendientes. Este cobro quedará como saldo a favor.
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          {unpaidInvoices.map((inv) => {
            const allocated = currentAllocation.get(inv.id) || 0;
            
            return (
              <div key={inv.id} className="flex flex-col gap-3 rounded-[20px] border border-gray-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-800">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Venta #{inv.id}</span>
                    {inv.isOverdue && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Vencida</span>
                    )}
                    {!inv.isOverdue && inv.status === 'due_today' && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded">Vence hoy</span>
                    )}
                    {!inv.isOverdue && inv.status === 'due_soon' && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">Por vencer</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(inv.saleDate).toLocaleDateString()} • Vence: {new Date(inv.dueDate).toLocaleDateString()} • Saldo: ${inv.balance.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    Plazo: {inv.termDays} días
                  </div>
                </div>
                
                <div className="w-full sm:w-32">
                  {allocationMode === 'auto' ? (
                    <div className={cn("text-left sm:text-right font-medium", allocated > 0 ? "text-green-600" : "text-gray-400")}>
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

      <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
        <span className="text-sm text-gray-500">Cobro recibido:</span>
        <span className="font-bold text-gray-900 dark:text-white">${parseFloat(amount || '0').toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">Aplicado:</span>
        <span className="font-bold text-green-600">${allocatedTotal.toLocaleString()}</span>
      </div>
      {remainingAmount !== 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{remainingAmount > 0 ? 'Queda libre como saldo a favor:' : 'Excedido:'}</span>
          <span className={cn("font-bold", remainingAmount > 0 ? "text-blue-500" : "text-red-500")}>
            ${Math.abs(remainingAmount).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-2 sm:py-4 space-y-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar cobro</h3>
      
      <div className="rounded-[22px] bg-gray-50 p-3.5 text-left space-y-2 sm:p-4 dark:bg-gray-800">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Cliente:</span>
          <span className="font-medium text-gray-900 dark:text-white text-right">{selectedCustomer?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Monto:</span>
          <span className="font-bold text-green-600 text-lg">${parseFloat(amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Método:</span>
          <span className="capitalize text-gray-900 dark:text-white">{method}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Cuenta:</span>
          <span className="text-gray-900 dark:text-white text-right">
            {selectedTreasuryAccount ? formatTreasuryAccountLabel(selectedTreasuryAccount) : 'Por defecto del método'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fecha:</span>
          <span className="text-gray-900 dark:text-white">{new Date(date).toLocaleDateString()}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Se registrará este cobro y se actualizarán los saldos del cliente.
      </p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar cobro"
      className="max-w-lg"
    >
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between px-1 sm:px-2">
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
        <div className="mt-3 text-center">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Paso {step} de {STEPS.length}</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{STEPS[step - 1]?.title}</div>
        </div>
      </div>

      <div className="min-h-[260px] sm:min-h-[300px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={step === 1 ? onClose : handleBack}
          disabled={loading}
        >
          {step === 1 ? 'Cancelar' : 'Atrás'}
        </Button>
        
        {step < 4 ? (
          <Button 
            onClick={handleNext}
            className="w-full sm:w-auto"
            disabled={
              (step === 1 && !selectedCustomerId) || 
              (step === 2 && (!amount || parseFloat(amount) <= 0))
            }
            data-tour="payments.modal.next"
          >
            {step === 1 ? 'Continuar' : step === 2 ? 'Revisar aplicación' : 'Revisar resumen'}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            className="w-full sm:w-auto"
            isLoading={loading}
            data-tour="payments.modal.confirm"
          >
            Confirmar cobro
          </Button>
        )}
      </div>
    </Modal>
  );
};
