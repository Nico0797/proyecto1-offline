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

const receivableStatusBadgeClasses: Record<'overdue' | 'due_today' | 'due_soon', string> = {
  overdue: 'app-status-chip app-status-chip-danger !px-2 !py-0.5 !text-[10px]',
  due_today: 'app-status-chip app-status-chip-warning !px-2 !py-0.5 !text-[10px]',
  due_soon: 'app-status-chip app-status-chip-warning !px-2 !py-0.5 !text-[10px]',
};

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
      const allocationEntries = Array.from(currentAllocation.entries()).filter(([, value]) => value > 0);
      const exactSingleSaleId = allocationEntries.length === 1 && Math.abs(remainingAmount) < 0.01
        ? allocationEntries[0][0]
        : undefined;

      await createPayment(activeBusiness.id, {
        customer_id: selectedCustomerId,
        sale_id: exactSingleSaleId,
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
      <div className="app-inline-panel-info px-3.5 py-3 text-sm">
        Elige el cliente que te está pagando hoy.
      </div>
      <div className="relative" data-tour="payments.modal.clientSearch">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 app-text-muted w-4 h-4" />
        <Input
          placeholder="Busca el cliente que va a pagar"
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>
      
      <div className="app-surface custom-scrollbar max-h-56 overflow-y-auto divide-y divide-[color:var(--app-divider)] rounded-[20px]" data-tour="payments.modal.clientList">
        {customers
          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedCustomerId(c.id)}
              className={cn(
                'px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-[color:var(--app-surface-soft)]',
                selectedCustomerId === c.id && 'bg-[color:var(--app-primary-soft)]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="app-muted-panel w-8 h-8 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 app-text-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium app-text">{c.name}</p>
                  <p className="text-xs app-text-muted">Deuda: ${c.balance.toLocaleString()}</p>
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
      <div className="app-inline-panel flex items-center justify-between gap-3 px-3.5 py-3">
        <span className="text-sm app-text-muted">Cliente:</span>
        <span className="font-bold app-text text-right">{selectedCustomer?.name}</span>
      </div>

      <div className="app-inline-panel px-3.5 py-3 text-sm">
        Registra el valor, el medio y la cuenta donde entró.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" data-tour="payments.modal.details">
        <div>
          <label className="block text-sm font-medium app-text-secondary mb-1">Monto recibido</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 app-text-muted w-4 h-4" />
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
          <label className="block text-sm font-medium app-text-secondary mb-1">Fecha</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium app-text-secondary mb-1">Forma de cobro</label>
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
        <label className="block text-sm font-medium app-text-secondary mb-1">Nota o referencia</label>
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
        <h4 className="text-sm font-semibold app-text">A qué ventas aplicar este cobro</h4>
        <div className="app-segmented-control w-fit text-xs shadow-sm">
          <button 
            onClick={() => setAllocationMode('auto')}
            className={cn('app-segmented-option px-2.5 py-1', allocationMode === 'auto' ? 'app-segmented-option-active' : '')}
          >
            Sugerido
          </button>
          <button 
            onClick={() => setAllocationMode('manual')}
            className={cn('app-segmented-option px-2.5 py-1', allocationMode === 'manual' ? 'app-segmented-option-active' : '')}
          >
            Elegir yo
          </button>
        </div>
      </div>

      {unpaidInvoices.length === 0 ? (
        <div className="app-empty-state p-4 rounded-lg text-center app-text-muted text-sm">
          Este cliente no tiene ventas pendientes. Este cobro quedará como saldo a favor.
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          {unpaidInvoices.map((inv) => {
            const allocated = currentAllocation.get(inv.id) || 0;
            
            return (
              <div key={inv.id} className="app-surface flex flex-col gap-3 rounded-[20px] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium app-text">Venta #{inv.id}</span>
                    {inv.isOverdue && (
                      <span className={receivableStatusBadgeClasses.overdue}>Vencida</span>
                    )}
                    {!inv.isOverdue && inv.status === 'due_today' && (
                      <span className={receivableStatusBadgeClasses.due_today}>Vence hoy</span>
                    )}
                    {!inv.isOverdue && inv.status === 'due_soon' && (
                      <span className={receivableStatusBadgeClasses.due_soon}>Por vencer</span>
                    )}
                  </div>
                  <div className="text-xs app-text-muted">
                    {new Date(inv.saleDate).toLocaleDateString()} • Vence: {new Date(inv.dueDate).toLocaleDateString()} • Saldo: ${inv.balance.toLocaleString()}
                  </div>
                  <div className="text-xs app-text-muted opacity-80">
                    Plazo: {inv.termDays} días
                  </div>
                </div>
                
                <div className="w-full sm:w-32">
                  {allocationMode === 'auto' ? (
                    <div className={cn('text-left sm:text-right font-medium', allocated > 0 ? 'text-[color:var(--app-success)]' : 'app-text-muted')}>
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

      <div className="flex items-center justify-between border-t app-divider pt-3">
        <span className="text-sm app-text-muted">Cobro recibido:</span>
        <span className="font-bold app-text">${parseFloat(amount || '0').toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm app-text-muted">Aplicado:</span>
        <span className="font-bold text-[color:var(--app-success)]">${allocatedTotal.toLocaleString()}</span>
      </div>
      {remainingAmount !== 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm app-text-muted">{remainingAmount > 0 ? 'Queda libre como saldo a favor:' : 'Excedido:'}</span>
          <span className={cn('font-bold', remainingAmount > 0 ? 'text-[color:var(--app-primary)]' : 'text-[color:var(--app-danger)]')}>
            ${Math.abs(remainingAmount).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-2 sm:py-4 space-y-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 app-inline-panel-success">
        <CheckCircle className="w-8 h-8 text-[color:var(--app-success)]" />
      </div>
      <h3 className="text-xl font-bold app-text">Confirmar cobro</h3>
      
      <div className="app-inline-panel p-3.5 text-left space-y-2 sm:p-4 rounded-[22px]">
        <div className="flex justify-between gap-3">
          <span className="app-text-muted">Cliente:</span>
          <span className="font-medium app-text text-right">{selectedCustomer?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="app-text-muted">Monto:</span>
          <span className="font-bold text-[color:var(--app-success)] text-lg">${parseFloat(amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="app-text-muted">Método:</span>
          <span className="capitalize app-text">{method}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="app-text-muted">Cuenta:</span>
          <span className="app-text text-right">
            {selectedTreasuryAccount ? formatTreasuryAccountLabel(selectedTreasuryAccount) : 'Por defecto del método'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="app-text-muted">Fecha:</span>
          <span className="app-text">{new Date(date).toLocaleDateString()}</span>
        </div>
      </div>

      <p className="text-sm app-text-muted">
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
        <div className="app-stepper flex items-center justify-between rounded-[24px] px-3 py-3 sm:px-4">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              'app-step-node w-8 h-8 text-xs font-bold',
              step >= s.id 
                ? 'app-step-node-complete'
                : ''
            )}>
              {s.id}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                'app-step-rail w-8 mx-2',
                step > s.id ? 'app-step-rail-active' : ''
              )} />
            )}
          </div>
        ))}
        </div>
        <div className="mt-3 text-center">
          <div className="text-[11px] uppercase tracking-wide app-text-muted">Paso {step} de {STEPS.length}</div>
          <div className="text-sm font-semibold app-text">{STEPS[step - 1]?.title}</div>
        </div>
      </div>

      <div className="min-h-[260px] sm:min-h-[300px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 mt-5 pt-4 border-t app-divider">
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
