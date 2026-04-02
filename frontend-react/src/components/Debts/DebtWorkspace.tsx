import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, Plus, Search, Wallet } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useDebtStore } from '../../store/debtStore';
import { useSupplierPayablesStore } from '../../store/supplierPayablesStore';
import { Debt, DebtsSummary } from '../../types/debts';
import { SupplierPayable, SupplierPayableStatus } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';
import { DebtSummary } from './DebtSummary';
import { UpcomingDebts } from './UpcomingDebts';
import { DebtList } from './DebtList';
import { DebtFormModal } from './DebtFormModal';
import { DebtPaymentModal } from './DebtPaymentModal';
import { DebtDetails } from './DebtDetails';
import { useAccess } from '../../hooks/useAccess';
import { cn } from '../../utils/cn';

interface DebtWorkspaceProps {
  scope: 'operational' | 'financial';
}

const OPERATIONAL_CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'proveedores', label: 'Proveedores' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'otros', label: 'Otros' },
];

const FINANCIAL_CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'tarjetas', label: 'Tarjetas' },
  { value: 'prestamos', label: 'Préstamos' },
  { value: 'financiaciones', label: 'Financiaciones' },
  { value: 'creditos', label: 'Créditos' },
  { value: 'leasing', label: 'Leasing' },
];

const STATUS_LABELS: Record<SupplierPayableStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
};

const formatCurrency = (value?: number | null, currency = 'COP') => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const getSupplierStatusClass = (status: SupplierPayableStatus) => {
  if (status === 'paid') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (status === 'partial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
};

const isSupplierPayableOverdue = (payable: SupplierPayable) => {
  if (!payable.due_date || payable.status === 'paid') return false;
  return new Date(payable.due_date).getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime();
};

const isSupplierPayableDueToday = (payable: SupplierPayable) => {
  if (!payable.due_date || payable.status === 'paid') return false;
  return new Date(payable.due_date).toDateString() === new Date().toDateString();
};

const isSupplierPayableDueSoon = (payable: SupplierPayable) => {
  if (!payable.due_date || payable.status === 'paid') return false;
  const target = new Date(payable.due_date);
  const base = new Date(new Date().setHours(0, 0, 0, 0));
  const diff = Math.ceil((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 && diff <= 7;
};

export const DebtWorkspace = ({ scope }: DebtWorkspaceProps) => {
  const { activeBusiness } = useBusinessStore();
  const { hasPermission, hasModule } = useAccess();
  const { debts, summary, loading, fetchDebts, fetchSummary, deleteDebt } = useDebtStore();
  const {
    payables,
    selectedPayable,
    loading: supplierLoading,
    error: supplierError,
    fetchPayables,
    setSelectedPayable,
  } = useSupplierPayablesStore();

  const canCreate = hasPermission('expenses.create');
  const canUpdate = hasPermission('expenses.update');
  const canDelete = hasPermission('expenses.delete');
  const canReadSupplierPayables = scope === 'operational' && hasModule('raw_inventory') && hasPermission('supplier_payables.read');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | undefined>(undefined);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
  });
  const [isSupplierDetailOpen, setIsSupplierDetailOpen] = useState(false);

  const pageTitle = scope === 'financial' ? 'Deudas' : 'Por pagar';
  const pageDescription = scope === 'financial'
    ? 'Pasivos financieros separados de proveedores, servicios y compras a crédito.'
    : 'Obligaciones operativas pendientes: manuales, recurrentes, servicios y compras a crédito.';
  const createLabel = scope === 'financial' ? 'Nueva deuda financiera' : 'Nueva obligación';
  const categoryOptions = scope === 'financial' ? FINANCIAL_CATEGORY_OPTIONS : OPERATIONAL_CATEGORY_OPTIONS;

  useEffect(() => {
    if (!activeBusiness) return;
    fetchDebts(activeBusiness.id, { ...filters, scope });
    fetchSummary(activeBusiness.id, scope);
  }, [activeBusiness, filters, scope, fetchDebts, fetchSummary]);

  useEffect(() => {
    if (!activeBusiness || !canReadSupplierPayables) return;
    fetchPayables(activeBusiness.id, {
      search: filters.search || undefined,
    });
  }, [activeBusiness, canReadSupplierPayables, fetchPayables, filters.search]);

  const visibleSupplierPayables = useMemo(() => {
    if (!canReadSupplierPayables) return [] as SupplierPayable[];
    return payables.filter((payable) => {
      if (filters.status === 'active') return payable.status !== 'paid';
      if (filters.status === 'pending' || filters.status === 'partial' || filters.status === 'paid') return payable.status === filters.status;
      if (filters.status === 'overdue') return isSupplierPayableOverdue(payable);
      return true;
    });
  }, [canReadSupplierPayables, filters.status, payables]);

  const combinedSummary = useMemo<DebtsSummary | null>(() => {
    if (scope !== 'operational') return summary;
    const openSupplierPayables = visibleSupplierPayables.filter((payable) => payable.status !== 'paid' && Number(payable.balance_due || 0) > 0);
    const overdueSupplierPayables = openSupplierPayables.filter(isSupplierPayableOverdue);
    const dueTodaySupplierPayables = openSupplierPayables.filter(isSupplierPayableDueToday);
    const dueSoonSupplierPayables = openSupplierPayables.filter(isSupplierPayableDueSoon);
    const base = summary || {
      total_debt: 0,
      active_count: 0,
      overdue_total: 0,
      overdue_count: 0,
      due_today_total: 0,
      due_soon_total: 0,
      paid_this_month: 0,
    };
    return {
      ...base,
      total_debt: Number(base.total_debt || 0) + openSupplierPayables.reduce((acc, payable) => acc + Number(payable.balance_due || 0), 0),
      active_count: Number(base.active_count || 0) + openSupplierPayables.length,
      overdue_total: Number(base.overdue_total || 0) + overdueSupplierPayables.reduce((acc, payable) => acc + Number(payable.balance_due || 0), 0),
      overdue_count: Number(base.overdue_count || 0) + overdueSupplierPayables.length,
      due_today_total: Number(base.due_today_total || 0) + dueTodaySupplierPayables.reduce((acc, payable) => acc + Number(payable.balance_due || 0), 0),
      due_soon_total: Number(base.due_soon_total || 0) + dueSoonSupplierPayables.reduce((acc, payable) => acc + Number(payable.balance_due || 0), 0),
      paid_this_month: Number(base.paid_this_month || 0),
    };
  }, [scope, summary, visibleSupplierPayables]);

  const supplierTotals = useMemo(() => ({
    totalAmount: visibleSupplierPayables.reduce((acc, payable) => acc + Number(payable.amount_total || 0), 0),
    totalPaid: visibleSupplierPayables.reduce((acc, payable) => acc + Number(payable.amount_paid || 0), 0),
    totalDue: visibleSupplierPayables.reduce((acc, payable) => acc + Number(payable.balance_due || 0), 0),
  }), [visibleSupplierPayables]);

  const handleEdit = (debt: Debt) => {
    if (!canUpdate) return;
    setSelectedDebt(debt);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!canDelete || !activeBusiness) return;
    if (!window.confirm(scope === 'financial' ? '¿Estás seguro de eliminar esta deuda financiera?' : '¿Estás seguro de eliminar esta obligación?')) return;
    try {
      await deleteDebt(activeBusiness.id, id);
      toast.success(scope === 'financial' ? 'Deuda financiera eliminada' : 'Obligación eliminada');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No se pudo eliminar el registro');
    }
  };

  const handlePayment = (debt: Debt) => {
    if (!canCreate) return;
    setSelectedDebt(debt);
    setIsPaymentOpen(true);
  };

  const handleDetails = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsDetailsOpen(true);
  };

  const openSupplierDetails = (payable: SupplierPayable) => {
    setSelectedPayable({
      ...payable,
      payments: Array.isArray(payable.payments) ? payable.payments : [],
    });
    setIsSupplierDetailOpen(true);
  };

  const closeSupplierDetails = () => {
    setIsSupplierDetailOpen(false);
    setSelectedPayable(null);
  };

  if (!activeBusiness) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pageDescription}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => { setSelectedDebt(undefined); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> {createLabel}
          </Button>
        ) : null}
      </div>

      <DebtSummary summary={combinedSummary} />
      {scope === 'financial' ? <UpcomingDebts debts={debts} loading={loading} /> : null}

      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 md:static md:bg-transparent md:p-0 md:backdrop-filter-none">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={scope === 'financial' ? 'Buscar deuda, acreedor o entidad...' : 'Buscar obligación, proveedor o servicio...'}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <select
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm min-w-[140px]"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Todos los estados</option>
              <option value="active">Abiertas</option>
              <option value="pending">Pendientes</option>
              <option value="partial">Parciales</option>
              <option value="overdue">Vencidas</option>
              <option value="paid">Pagadas</option>
            </select>
            <select
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm min-w-[160px]"
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            >
              {categoryOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DebtList
        debts={debts}
        loading={loading}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canRegisterPayment={canCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewDetails={handleDetails}
        onRegisterPayment={handlePayment}
      />

      {scope === 'operational' && canReadSupplierPayables ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Compras a crédito y proveedores</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aquí ves las obligaciones operativas generadas desde compras confirmadas a crédito.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total obligaciones</div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(supplierTotals.totalAmount, activeBusiness.currency || 'COP')}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total pagado</div>
              <div className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(supplierTotals.totalPaid, activeBusiness.currency || 'COP')}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Saldo pendiente</div>
              <div className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(supplierTotals.totalDue, activeBusiness.currency || 'COP')}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.2fr_1fr_120px_120px_120px_auto] gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <div>Proveedor / Compra</div>
              <div>Vencimiento</div>
              <div>Total</div>
              <div>Saldo</div>
              <div>Estado</div>
              <div className="text-right">Acciones</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {supplierError && !supplierLoading ? (
                <div className="px-4 py-6">
                  <TeachingEmptyState
                    compact
                    icon={Wallet}
                    title="No fue posible cargar compras a crédito"
                    description={supplierError}
                  />
                </div>
              ) : null}
              {!supplierError && visibleSupplierPayables.length === 0 && !supplierLoading ? (
                <div className="px-4 py-6">
                  <TeachingEmptyState
                    compact
                    icon={Wallet}
                    title={filters.search || filters.status ? 'No hay obligaciones de proveedores con este filtro' : 'No hay compras a crédito pendientes'}
                    description={filters.search || filters.status
                      ? 'Prueba limpiando filtros para revisar compras a crédito u obligaciones históricas.'
                      : 'Cuando el backend exponga más flujo operativo de compras, aquí seguirás viendo el saldo pendiente con proveedores.'}
                  />
                </div>
              ) : null}
              {visibleSupplierPayables.map((payable) => (
                <div key={payable.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <div className="flex flex-col gap-4 md:grid md:grid-cols-[1.2fr_1fr_120px_120px_120px_auto] md:items-center md:gap-4">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{payable.supplier_name || 'Proveedor'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{payable.raw_purchase_number ? `Compra ${payable.raw_purchase_number}` : 'Sin compra asociada'}</div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{payable.due_date || '—'}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(payable.amount_total, activeBusiness.currency || 'COP')}</div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-300">{formatCurrency(payable.balance_due, activeBusiness.currency || 'COP')}</div>
                    <div>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getSupplierStatusClass(payable.status))}>
                        {STATUS_LABELS[payable.status]}
                      </span>
                    </div>
                    <div className="flex justify-start md:justify-end gap-2">
                      <Button variant="secondary" onClick={() => openSupplierDetails(payable)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <DebtFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDebt(undefined);
        }}
        debtToEdit={selectedDebt}
        scope={scope}
      />

      {selectedDebt ? (
        <>
          <DebtPaymentModal
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            debt={selectedDebt}
          />
          <DebtDetails
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            debt={selectedDebt}
            onEdit={handleEdit}
            canEdit={canUpdate}
            canDeletePayments={canDelete}
          />
        </>
      ) : null}

      <Modal isOpen={isSupplierDetailOpen && !!selectedPayable} onClose={closeSupplierDetails} title={selectedPayable ? `Cuenta por pagar • ${selectedPayable.supplier_name}` : 'Cuenta por pagar'} className="max-w-4xl h-[90vh]">
        {selectedPayable ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Compra asociada</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedPayable.raw_purchase_number || '—'}</div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Total</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedPayable.amount_total, activeBusiness.currency || 'COP')}</div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Pagado</div>
                <div className="mt-2 font-semibold text-green-700 dark:text-green-300">{formatCurrency(selectedPayable.amount_paid, activeBusiness.currency || 'COP')}</div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Saldo</div>
                <div className="mt-2 font-semibold text-red-700 dark:text-red-300">{formatCurrency(selectedPayable.balance_due, activeBusiness.currency || 'COP')}</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Estado operativo</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Proveedor: {selectedPayable.supplier_name || 'Proveedor'}</div>
                </div>
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', getSupplierStatusClass(selectedPayable.status))}>
                  {STATUS_LABELS[selectedPayable.status]}
                </span>
              </div>
              {selectedPayable.notes ? (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedPayable.notes}</div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white">Historial de pagos</div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {selectedPayable.payments.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay pagos registrados todavía.
                  </div>
                ) : null}
                {selectedPayable.payments.map((payment) => (
                  <div key={payment.id} className="px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(payment.amount, activeBusiness.currency || 'COP')}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{payment.payment_date} {payment.method ? `• ${payment.method}` : ''} {payment.reference ? `• ${payment.reference}` : ''}</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{payment.created_by_name || 'Usuario'}{payment.created_by_role ? ` • ${payment.created_by_role}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Wallet className="w-4 h-4" /> Gestión operativa
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                El backend actual expone el listado consolidado de cuentas por pagar a proveedores, pero no el detalle operativo para registrar pagos desde esta vista.
              </p>
              <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <Button variant="secondary" onClick={closeSupplierDetails}>Cerrar</Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
