import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useBusinessStore } from '../../store/businessStore';
import { useDebtStore } from '../../store/debtStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Debt } from '../../types/debts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TreasuryAccountSelect } from '../Treasury/TreasuryAccountSelect';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit?: Debt;
  scope?: 'operational' | 'financial';
}

const OPERATIONAL_DEBT_CATEGORIES = [
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'otros', label: 'Otras Obligaciones' },
];

const FINANCIAL_DEBT_CATEGORIES = [
  { value: 'tarjetas', label: 'Tarjetas de Crédito' },
  { value: 'prestamos', label: 'Préstamos' },
  { value: 'financiaciones', label: 'Financiaciones' },
  { value: 'creditos', label: 'Créditos' },
  { value: 'leasing', label: 'Leasing' },
];

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  debtToEdit,
  scope = 'operational',
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addDebt, updateDebt } = useDebtStore();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialPayment, setInitialPayment] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('cash');
  const [initialPaymentTreasuryAccountId, setInitialPaymentTreasuryAccountId] = useState<number | null>(null);
  const categoryOptions = scope === 'financial' ? FINANCIAL_DEBT_CATEGORIES : OPERATIONAL_DEBT_CATEGORIES;
  const formTitle = debtToEdit
    ? scope === 'financial' ? 'Editar deuda financiera' : 'Editar obligación operativa'
    : scope === 'financial' ? 'Nueva deuda financiera' : 'Nueva obligación operativa';
  const successLabel = scope === 'financial' ? 'Deuda financiera' : 'Obligación';
  const creditorPlaceholder = scope === 'financial'
    ? 'Ej: Banco X, entidad financiera, tarjeta corporativa'
    : 'Ej: Proveedor Y, empresa de servicios, arrendador';
  
  const [formData, setFormData] = useState({
    name: '',
    creditor_name: '',
    category: '',
    total_amount: '',
    balance_due: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    frequency: 'unique' as 'unique' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual',
    status: 'pending' as 'pending' | 'partial' | 'paid' | 'overdue',
    notes: '',
    reminder_enabled: false,
    interest_rate: '',
    installments: '',
    estimated_installment: '',
  });

  useEffect(() => {
    if (debtToEdit) {
      setFormData({
        name: debtToEdit.name,
        creditor_name: debtToEdit.creditor_name || '',
        category: debtToEdit.category || '',
        total_amount: debtToEdit.total_amount.toString(),
        balance_due: debtToEdit.balance_due.toString(),
        start_date: debtToEdit.start_date || '',
        due_date: debtToEdit.due_date || '',
        frequency: debtToEdit.frequency || 'unique',
        status: debtToEdit.status,
        notes: debtToEdit.notes || '',
        reminder_enabled: debtToEdit.reminder_enabled,
        interest_rate: debtToEdit.interest_rate?.toString() || '',
        installments: debtToEdit.installments?.toString() || '',
        estimated_installment: debtToEdit.estimated_installment?.toString() || '',
      });
      setShowAdvanced(true); // Always show advanced when editing
      setInitialPayment('');
      setInitialPaymentMethod('cash');
      setInitialPaymentTreasuryAccountId(null);
    } else {
      setFormData({
        name: '',
        creditor_name: '',
        category: '',
        total_amount: '',
        balance_due: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        frequency: 'unique',
        status: 'pending',
        notes: '',
        reminder_enabled: false,
        interest_rate: '',
        installments: '',
        estimated_installment: '',
      });
      setShowAdvanced(false); // Default to simple for new
      setInitialPayment('');
      setInitialPaymentMethod('cash');
      setInitialPaymentTreasuryAccountId(null);
    }
    setSubmitError(null);
  }, [debtToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    setSubmitError(null);
    try {
      // Auto-fill name if empty
      const finalName = formData.name.trim() || formData.creditor_name || 'Nueva Deuda';
      const totalAmount = parseFloat(formData.total_amount || '0');
      const initialPaymentAmount = parseFloat(initialPayment || '0') || 0;
      const explicitBalance = formData.balance_due ? parseFloat(formData.balance_due) : undefined;
      
      const data: any = {
        name: finalName,
        creditor_name: formData.creditor_name,
        category: formData.category,
        scope,
        total_amount: totalAmount,
        start_date: formData.start_date,
        due_date: formData.due_date || undefined,
        frequency: formData.frequency,
        notes: formData.notes,
        reminder_enabled: formData.reminder_enabled,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
        installments: formData.installments ? parseInt(formData.installments) : undefined,
        estimated_installment: formData.estimated_installment ? parseFloat(formData.estimated_installment) : undefined,
      };

      if (debtToEdit) {
        data.balance_due = explicitBalance ?? totalAmount;
      } else if (explicitBalance !== undefined && explicitBalance !== totalAmount) {
        data.balance_due = explicitBalance;
      }

      if (!debtToEdit && initialPaymentAmount > 0) {
        data.initial_payment_amount = initialPaymentAmount;
        data.payment_method = initialPaymentMethod;
        data.treasury_account_id = initialPaymentTreasuryAccountId;
      }

      if (debtToEdit) {
        await updateDebt(activeBusiness.id, debtToEdit.id, data);
        toast.success(`${successLabel} actualizada`);
      } else {
        await addDebt(activeBusiness.id, data);
        toast.success(`${successLabel} creada`);
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving debt:', error);
      setSubmitError(error?.response?.data?.error || 'No se pudo guardar la obligación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formTitle}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError ? (
          <FormAlert
            tone="error"
            title="No fue posible guardar la obligación"
            message={submitError}
          />
        ) : null}
        
        {/* Simple Mode Fields (Always Visible) */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            ¿A quién le debes? *
          </label>
          <Input
            value={formData.creditor_name}
            onChange={(e) => setFormData({ ...formData, creditor_name: e.target.value })}
            placeholder={creditorPlaceholder}
            required={!formData.name} // Either name or creditor is required effectively
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Monto Total *
              </label>
              <CurrencyInput
                value={formData.total_amount}
                onChange={(val) => {
                  const newVal = String(val || '');
                  // If creating new, auto-fill balance due
                  if (!debtToEdit && (!formData.balance_due || formData.balance_due === formData.total_amount)) {
                    setFormData({ ...formData, total_amount: newVal, balance_due: newVal });
                  } else {
                    setFormData({ ...formData, total_amount: newVal });
                  }
                }}
                required
                placeholder="0.00"
              />
            </div>

            {/* Initial Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pago Inicial (Opcional)
              </label>
              <CurrencyInput
                value={initialPayment}
                onChange={(val) => setInitialPayment(String(val || ''))}
                placeholder="0.00"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vencimiento *
                </label>
                <input
                  type="date"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
            </div>
        </div>

        {!debtToEdit && Number(initialPayment || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Método del pago inicial</label>
              <select
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={initialPaymentMethod}
                onChange={(e) => setInitialPaymentMethod(e.target.value)}
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
            <div />
          </div>
        ) : null}

        {!debtToEdit && Number(initialPayment || 0) > 0 ? (
          <TreasuryAccountSelect
            businessId={activeBusiness?.id}
            value={initialPaymentTreasuryAccountId}
            onChange={(value) => setInitialPaymentTreasuryAccountId(value)}
            helperText="Elige la cuenta desde la que sale el pago inicial."
          />
        ) : null}

        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
            Categoría (Opcional)
            </label>
            <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
            <option value="">Seleccionar...</option>
            {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
            ))}
            </select>
        </div>

        {/* Toggle Advanced */}
        <div className="pt-2">
            <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-blue-500 hover:text-blue-400 font-medium"
            >
                {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showAdvanced ? 'Ocultar opciones avanzadas' : 'Configuración avanzada'}
            </button>
        </div>

        {/* Advanced Fields */}
        {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Título / Nombre (Opcional)
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Préstamo Libre Inversión (opcional)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Si lo dejas vacío, se usará el nombre del acreedor.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Saldo Pendiente
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-7 pr-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.balance_due}
                                onChange={(e) => setFormData({ ...formData, balance_due: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Estado
                        </label>
                        <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="pending">Pendiente</option>
                            <option value="partial">Parcial</option>
                            <option value="paid">Pagada</option>
                            <option value="overdue">Vencida</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Periodicidad
                    </label>
                    <select
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    >
                        <option value="unique">Única vez</option>
                        <option value="weekly">Semanal</option>
                        <option value="biweekly">Quincenal</option>
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Interés %</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            placeholder="%" 
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.interest_rate} 
                            onChange={e => setFormData({...formData, interest_rate: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cuotas</label>
                        <input 
                            type="number" 
                            placeholder="#" 
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.installments} 
                            onChange={e => setFormData({...formData, installments: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor Cuota</label>
                        <input 
                            type="number" 
                            placeholder="$" 
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={formData.estimated_installment} 
                            onChange={e => setFormData({...formData, estimated_installment: e.target.value})} 
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Notas
                    </label>
                    <textarea
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Detalles adicionales..."
                    />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reminder_enabled"
                    checked={formData.reminder_enabled}
                    onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="reminder_enabled" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
                    Activar recordatorios
                  </label>
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Guardando...' : debtToEdit ? 'Guardar cambios' : scope === 'financial' ? 'Crear deuda financiera' : 'Crear obligación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
