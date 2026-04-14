import { useEffect, useMemo, useState } from 'react';
import { Archive, ClipboardList, CreditCard, Eye, PackagePlus, Pencil, Search, SlidersHorizontal, Trash2, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { PageBody, PageHeader, PageHeaderActionButton, PageLayout } from '../components/Layout/PageLayout';
import { useBusinessStore } from '../store/businessStore';
import { useAccess } from '../hooks/useAccess';
import { useRawPurchasesStore } from '../store/rawPurchasesStore';
import { rawInventoryService } from '../services/rawInventoryService';
import { supplierService } from '../services/supplierService';
import { calcRawPurchaseItemSubtotal } from '../services/rawPurchasesService';
import { RawMaterial, RawPurchase, RawPurchaseItem, RawPurchaseStatus, Supplier, SupplierPayableStatus } from '../types';
import { cn } from '../utils/cn';
import { TreasuryAccountSelect } from '../components/Treasury/TreasuryAccountSelect';

const PURCHASE_STATUS_LABELS: Record<RawPurchaseStatus, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

const purchaseStatusClass = (status: RawPurchaseStatus) => {
  if (status === 'confirmed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (status === 'cancelled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

const SUPPLIER_PAYABLE_STATUS_LABELS: Record<SupplierPayableStatus, string> = {
  pending: 'Pendiente',
  partial: 'Abonada',
  paid: 'Saldada',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};

const formatNumber = (value: number) => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
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

const purchaseFlowClass = (purchase: RawPurchase) => {
  if (purchase.status !== 'confirmed' || !purchase.financial_flow) {
    return 'app-chip';
  }
  return purchase.financial_flow === 'cash'
    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

const purchaseFlowLabel = (purchase: RawPurchase) => {
  if (purchase.status !== 'confirmed' || !purchase.financial_flow) return 'Por definir';
  return purchase.financial_flow === 'cash' ? 'Contado' : 'Por pagar';
};

const purchaseFlowDetail = (purchase: RawPurchase, currency = 'COP') => {
  if (purchase.status === 'draft') return 'Se define al confirmar';
  if (purchase.status === 'cancelled') return 'Sin impacto financiero';
  if (purchase.financial_flow === 'cash') {
    return purchase.purchase_payment_method
      ? `Pago: ${PAYMENT_METHOD_LABELS[purchase.purchase_payment_method] || purchase.purchase_payment_method}`
      : 'Movimiento real registrado';
  }
  if (purchase.financial_flow === 'payable') {
    const balanceDue = Number(purchase.supplier_payable_balance_due || 0);
    if (purchase.supplier_payable_status === 'paid' || balanceDue <= 0.0001) {
      return 'Sin saldo pendiente';
    }
    const payableStatus = purchase.supplier_payable_status
      ? SUPPLIER_PAYABLE_STATUS_LABELS[purchase.supplier_payable_status]
      : 'Pendiente';
    return `${payableStatus} • Saldo ${formatCurrency(balanceDue, currency)}`;
  }
  return 'Sin trazabilidad financiera';
};

const purchaseTraceLabel = (purchase: RawPurchase) => {
  if (purchase.status !== 'confirmed') return null;
  return purchase.financial_flow === 'payable' ? 'Ver en Por pagar' : 'Ver en Movimientos';
};

const emptyItem = (): RawPurchaseItem => ({
  raw_material_id: 0,
  description: '',
  quantity: 1,
  unit_cost: 0,
  subtotal: 0,
});

export const RawPurchases = () => {
  const { activeBusiness } = useBusinessStore();
  const navigate = useNavigate();
  const { hasModule, hasPermission } = useAccess();
  const {
    purchases,
    selectedPurchase,
    loading,
    saving,
    error,
    fetchPurchases,
    fetchPurchase,
    createPurchase,
    updatePurchase,
    confirmPurchase,
    cancelPurchase,
    setSelectedPurchase,
  } = useRawPurchasesStore();

  const canRead = hasModule('raw_inventory') && hasPermission('raw_purchases.read');
  const canCreate = hasModule('raw_inventory') && hasPermission('raw_purchases.create');
  const canUpdate = hasModule('raw_inventory') && hasPermission('raw_purchases.update');
  const canConfirm = hasModule('raw_inventory') && hasPermission('raw_purchases.confirm');

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RawPurchaseStatus>('all');

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<RawPurchase | null>(null);
  const [purchaseToConfirm, setPurchaseToConfirm] = useState<RawPurchase | null>(null);
  const [confirmFinancialFlow, setConfirmFinancialFlow] = useState<'cash' | 'payable'>('payable');
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState('cash');
  const [confirmTreasuryAccountId, setConfirmTreasuryAccountId] = useState<number | null>(null);

  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RawPurchaseItem[]>([emptyItem()]);

  const selectedSupplierOption = useMemo(() => {
    if (!supplierId) return null;
    return suppliers.find((supplier) => supplier.id === Number(supplierId)) || null;
  }, [suppliers, supplierId]);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchPurchases(activeBusiness.id, {
      search: searchTerm || undefined,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
    });
  }, [activeBusiness, canRead, searchTerm, selectedStatus]);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    const loadReferences = async () => {
      try {
        const [rawMaterials, suppliersList] = await Promise.all([
          rawInventoryService.list(activeBusiness.id),
          supplierService.list(activeBusiness.id),
        ]);
        setMaterials(rawMaterials.filter((material) => material.is_active));
        setSuppliers(suppliersList.filter((supplier) => supplier.is_active));
      } catch (err: any) {
        toast.error(err?.response?.data?.error || err?.message || 'No fue posible preparar materias primas o proveedores.');
      }
    };
    loadReferences();
  }, [activeBusiness, canRead]);

  const summary = useMemo(() => ({
    draft: purchases.filter((purchase) => purchase.status === 'draft').length,
    confirmed: purchases.filter((purchase) => purchase.status === 'confirmed').length,
    cancelled: purchases.filter((purchase) => purchase.status === 'cancelled').length,
  }), [purchases]);

  const totals = useMemo(() => items.reduce((acc, item) => acc + calcRawPurchaseItemSubtotal(item), 0), [items]);

  const resetForm = () => {
    setPurchaseNumber('');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setSupplierId('');
    setNotes('');
    setItems([emptyItem()]);
  };

  const openCreate = () => {
    setEditingPurchase(null);
    resetForm();
    setIsPurchaseModalOpen(true);
  };

  const openEdit = async (purchase: RawPurchase) => {
    if (!activeBusiness) return;
    const fullPurchase = purchase.items?.length ? purchase : await fetchPurchase(activeBusiness.id, purchase.id);
    if (!fullPurchase) return;
    setEditingPurchase(fullPurchase);
    setPurchaseNumber(fullPurchase.purchase_number || '');
    setPurchaseDate(fullPurchase.purchase_date || new Date().toISOString().slice(0, 10));
    setSupplierId(fullPurchase.supplier_id ? String(fullPurchase.supplier_id) : '');
    setNotes(fullPurchase.notes || '');
    setItems(fullPurchase.items.length > 0 ? fullPurchase.items.map((item) => ({ ...item })) : [emptyItem()]);
    if (fullPurchase.supplier_id && !suppliers.some((supplier) => supplier.id === fullPurchase.supplier_id)) {
      setSuppliers((current) => (current.some((supplier) => supplier.id === fullPurchase.supplier_id)
        ? current
        : [{
            id: fullPurchase.supplier_id as number,
            business_id: activeBusiness.id,
            name: `${fullPurchase.supplier_name || 'Proveedor'} (inactivo)`,
            contact_name: null,
            phone: null,
            email: null,
            notes: null,
            is_active: false,
            created_at: null,
            updated_at: null,
          }, ...current]));
    }
    setIsPurchaseModalOpen(true);
  };

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setEditingPurchase(null);
    resetForm();
  };

  const openDetails = async (purchase: RawPurchase) => {
    if (!activeBusiness) return;
    const fullPurchase = await fetchPurchase(activeBusiness.id, purchase.id);
    if (!fullPurchase) return;
    setSelectedPurchase(fullPurchase);
    setIsDetailOpen(true);
  };

  const closeDetails = () => {
    setIsDetailOpen(false);
    setSelectedPurchase(null);
  };

  const openConfirmModal = (purchase: RawPurchase) => {
    setPurchaseToConfirm(purchase);
    setConfirmFinancialFlow(purchase.supplier_id ? 'payable' : 'cash');
    setConfirmPaymentMethod('cash');
    setConfirmTreasuryAccountId(null);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setPurchaseToConfirm(null);
    setConfirmFinancialFlow('payable');
    setConfirmPaymentMethod('cash');
    setConfirmTreasuryAccountId(null);
  };

  const updateItem = (index: number, changes: Partial<RawPurchaseItem>) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updated = { ...item, ...changes };
      return { ...updated, subtotal: calcRawPurchaseItemSubtotal(updated) };
    }));
  };

  const addItem = () => setItems((current) => [...current, emptyItem()]);
  const removeItem = (index: number) => setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));

  const buildPayload = () => ({
    supplier_id: supplierId ? Number(supplierId) : null,
    purchase_number: purchaseNumber.trim() || null,
    purchase_date: purchaseDate,
    notes: notes || null,
    items: items.map((item) => ({
      raw_material_id: Number(item.raw_material_id),
      description: item.description || null,
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
    })),
  });

  const validateBeforeSave = () => {
    if (!purchaseDate) {
      toast.error('Debes ingresar la fecha de compra');
      return false;
    }
    if (items.length === 0) {
      toast.error('Debes agregar al menos un ítem');
      return false;
    }
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.raw_material_id) {
        toast.error(`Debes seleccionar la materia prima del ítem #${index + 1}`);
        return false;
      }
      if (Number(item.quantity || 0) <= 0) {
        toast.error(`La cantidad del ítem #${index + 1} debe ser mayor a 0`);
        return false;
      }
      if (Number(item.unit_cost || 0) < 0) {
        toast.error(`El costo unitario del ítem #${index + 1} no puede ser negativo`);
        return false;
      }
    }
    return true;
  };

  const handleSavePurchase = async () => {
    if (!activeBusiness) return;
    if (!validateBeforeSave()) return;
    const payload = buildPayload();
    try {
      if (editingPurchase) {
        await updatePurchase(activeBusiness.id, editingPurchase.id, payload);
        toast.success('Compra actualizada');
      } else {
        await createPurchase(activeBusiness.id, payload);
        toast.success('Compra creada en borrador');
      }
      closePurchaseModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible guardar la compra');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!activeBusiness || !purchaseToConfirm) return;
    if (confirmFinancialFlow === 'payable' && !purchaseToConfirm.supplier_id) {
      toast.error('Asocia un proveedor para confirmar la compra como por pagar');
      return;
    }
    try {
      await confirmPurchase(activeBusiness.id, purchaseToConfirm.id, {
        financial_flow: confirmFinancialFlow,
        payment_method: confirmFinancialFlow === 'cash' ? confirmPaymentMethod || null : null,
        treasury_account_id: confirmFinancialFlow === 'cash' ? confirmTreasuryAccountId : null,
      });
      toast.success(
        confirmFinancialFlow === 'cash'
          ? 'Compra confirmada, stock actualizado y salida registrada'
          : 'Compra confirmada, stock actualizado y obligación generada'
      );
      if (selectedPurchase?.id === purchaseToConfirm.id) {
        await fetchPurchase(activeBusiness.id, purchaseToConfirm.id);
      }
      closeConfirmModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible confirmar la compra');
    }
  };

  const openFinancialTrace = (purchase: RawPurchase) => {
    if (purchase.status !== 'confirmed') return;
    closeDetails();
    if (purchase.financial_flow === 'payable') {
      navigate('/expenses?tab=payables');
      return;
    }
    navigate('/expenses');
  };

  const handleCancelPurchase = async (purchase: RawPurchase) => {
    if (!activeBusiness) return;
    if (!window.confirm(`¿Cancelar la compra ${purchase.purchase_number}?`)) return;
    try {
      await cancelPurchase(activeBusiness.id, purchase.id);
      toast.success('Compra cancelada');
      if (selectedPurchase?.id === purchase.id) {
        await fetchPurchase(activeBusiness.id, purchase.id);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible cancelar la compra');
    }
  };

  if (!canRead) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="app-surface max-w-md w-full rounded-2xl p-6 text-center">
          <Archive className="w-10 h-10 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Compras de insumos</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tienes acceso a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout data-tour="raw-purchases.panel">
      <PageHeader
        title="Compras de insumos"
        description="Registra compras de bodega y confirma entradas automaticas al inventario de insumos."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="app-chip rounded-xl px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
              {summary.draft} borrador(es)
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300">
              {summary.confirmed} confirmada(s)
            </div>
            {canCreate && (
              <PageHeaderActionButton
                onClick={openCreate}
                icon={PackagePlus}
                label="Nueva compra"
                mobileLabel="Comprar"
                data-tour="raw-purchases.primaryAction"
              />
            )}
          </div>
        }
      />

      <PageBody className="space-y-6">
        <div className="app-surface p-4 shadow-sm" data-tour="raw-purchases.filters">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por número, proveedor o nota..." icon={Search} />
            <select className="app-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as 'all' | RawPurchaseStatus)}>
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="confirmed">Confirmadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <SlidersHorizontal className="w-4 h-4 mr-2" /> {loading ? 'Cargando compras...' : `${purchases.length} compra(s)`}
            </div>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="app-surface overflow-hidden shadow-sm" data-tour="raw-purchases.table">
          <div className="app-table-head hidden md:grid grid-cols-[1.1fr_1fr_140px_140px_180px_auto] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
            <div>Compra</div>
            <div>Proveedor</div>
            <div>Fecha</div>
            <div>Total</div>
            <div>Estado / condición</div>
            <div className="text-right">Acciones</div>
          </div>

          <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
            {purchases.length === 0 && !loading && (
              <div className="px-4 py-6">
                <TeachingEmptyState
                  compact
                  icon={PackagePlus}
                  title={searchTerm || selectedStatus !== 'all' ? 'No hay compras con este filtro' : 'Aún no has registrado compras de insumos'}
                  description={searchTerm || selectedStatus !== 'all'
                    ? 'Ajusta estado o búsqueda para revisar compras existentes.'
                    : 'Registra compras para ingresar stock a bodega y generar trazabilidad de costos y obligaciones con proveedores.'}
                  primaryActionLabel={canCreate ? 'Nueva compra' : undefined}
                  onPrimaryAction={canCreate ? openCreate : undefined}
                  secondaryActionLabel={searchTerm || selectedStatus !== 'all' ? 'Limpiar filtros' : undefined}
                  onSecondaryAction={searchTerm || selectedStatus !== 'all' ? (() => {
                    setSearchTerm('');
                    setSelectedStatus('all');
                  }) : undefined}
                />
              </div>
            )}

            {purchases.map((purchase) => (
              <div key={purchase.id} className="app-table-row px-4 py-4">
                <div className="flex flex-col gap-4 md:grid md:grid-cols-[1.1fr_1fr_140px_140px_180px_auto] md:items-center md:gap-4">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{purchase.purchase_number}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{purchase.items_count || purchase.items.length} ítem(s)</div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{purchase.supplier_name || 'Sin proveedor'}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{purchase.purchase_date}</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(purchase.total, activeBusiness?.currency || 'COP')}</div>
                  <div className="space-y-1">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', purchaseStatusClass(purchase.status))}>
                      {PURCHASE_STATUS_LABELS[purchase.status]}
                    </span>
                    <div>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', purchaseFlowClass(purchase))}>
                        {purchaseFlowLabel(purchase)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {purchaseFlowDetail(purchase, activeBusiness?.currency || 'COP')}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-start md:justify-end gap-2">
                    <Button variant="secondary" onClick={() => openDetails(purchase)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canUpdate && purchase.status === 'draft' && (
                      <Button variant="secondary" onClick={() => openEdit(purchase)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canConfirm && purchase.status === 'draft' && (
                      <Button variant="secondary" onClick={() => openConfirmModal(purchase)}>
                        <ClipboardList className="w-4 h-4" />
                      </Button>
                    )}
                    {canUpdate && purchase.status === 'draft' && (
                      <Button variant="secondary" onClick={() => handleCancelPurchase(purchase)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      <Modal isOpen={isPurchaseModalOpen} onClose={closePurchaseModal} title={editingPurchase ? 'Editar compra de insumos' : 'Nueva compra de insumos'} className="max-w-5xl max-h-[calc(100dvh-1.5rem)]">
        <div className="space-y-5" data-tour="raw-purchases.modal.form">
          <div className="app-muted-panel p-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Compra y abastecimiento</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Registra el borrador con claridad y deja preparada la confirmación para caja o por pagar.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Número de compra" value={purchaseNumber} onChange={(e) => setPurchaseNumber(e.target.value)} placeholder="Auto si lo dejas vacío" />
            <Input label="Fecha" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor</label>
              <select className="app-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id} disabled={!supplier.is_active}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {selectedSupplierOption && !selectedSupplierOption.is_active && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Este proveedor está inactivo. Debes elegir otro o guardar la compra sin proveedor para continuar.
                </p>
              )}
            </div>
          </div>

          <div className="app-surface overflow-hidden rounded-[24px]" data-tour="raw-purchases.modal.items">
            <div className="app-table-head px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Ítems de compra</div>
            <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, index) => (
                <div key={index} className="p-4 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materia prima</label>
                    <select className="app-select" value={item.raw_material_id || ''} onChange={(e) => {
                      const material = materials.find((entry) => entry.id === Number(e.target.value));
                      updateItem(index, {
                        raw_material_id: Number(e.target.value),
                        description: material?.name || item.description,
                      });
                    }}>
                      <option value="">Selecciona una materia prima</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Cantidad" type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value || 0) })} />
                  <Input label="Costo unitario" type="number" min="0" step="0.01" value={item.unit_cost} onChange={(e) => updateItem(index, { unit_cost: Number(e.target.value || 0) })} />
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtotal</div>
                    <div className="app-muted-panel flex h-10 items-center rounded-xl px-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatCurrency(calcRawPurchaseItemSubtotal(item), activeBusiness?.currency || 'COP')}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => removeItem(index)} disabled={items.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="app-divider flex flex-col gap-3 border-t p-4 md:flex-row md:items-center md:justify-between">
              <Button variant="secondary" onClick={addItem}>
                <PackagePlus className="w-4 h-4 mr-2" /> Agregar ítem
              </Button>
              <div className="text-sm text-gray-700 dark:text-gray-300">Total estimado: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals, activeBusiness?.currency || 'COP')}</span></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea className="app-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referencia del proveedor, observaciones o contexto de la compra" />
          </div>

          <div className="app-divider flex flex-col-reverse gap-3 border-t pt-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closePurchaseModal}>Cancelar</Button>
            <Button onClick={handleSavePurchase} isLoading={saving} data-tour="raw-purchases.modal.confirm">Guardar borrador</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isConfirmModalOpen && !!purchaseToConfirm} onClose={closeConfirmModal} title={purchaseToConfirm ? `Confirmar ${purchaseToConfirm.purchase_number}` : 'Confirmar compra'}>
        {purchaseToConfirm && (
          <div className="space-y-5">
            <div className="app-muted-panel p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total de la compra</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(purchaseToConfirm.total, activeBusiness?.currency || 'COP')}
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Define si esta compra impacta caja de inmediato o si se convierte en una obligación operativa.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmFinancialFlow('cash')}
                className={cn(
                  'rounded-[24px] border p-4 text-left transition-all',
                  confirmFinancialFlow === 'cash'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'app-surface'
                )}
              >
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                  <Wallet className="w-5 h-5" />
                  Contado
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Registra una salida de caja inmediata en movimientos.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!purchaseToConfirm.supplier_id) return;
                  setConfirmFinancialFlow('payable');
                  setConfirmTreasuryAccountId(null);
                }}
                disabled={!purchaseToConfirm.supplier_id}
                className={cn(
                  'rounded-[24px] border p-4 text-left transition-all',
                  confirmFinancialFlow === 'payable'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'app-surface',
                  !purchaseToConfirm.supplier_id && 'opacity-60 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                  <CreditCard className="w-5 h-5" />
                  Por pagar
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Genera una obligación operativa para pagar después, sin impactar caja ahora.
                </div>
              </button>
            </div>

            {!purchaseToConfirm.supplier_id && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                Sin proveedor asociado, esta compra solo puede confirmarse al contado.
              </div>
            )}

            {confirmFinancialFlow === 'cash' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
                  <select
                    className="app-select"
                    value={confirmPaymentMethod}
                    onChange={(e) => setConfirmPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <TreasuryAccountSelect
                  businessId={activeBusiness?.id}
                  value={confirmTreasuryAccountId}
                  onChange={(value) => setConfirmTreasuryAccountId(value)}
                  helperText="Elige la cuenta desde la que sale el dinero de esta compra pagada."
                />
              </div>
            ) : null}

            <div className="app-divider flex flex-col-reverse gap-3 border-t pt-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeConfirmModal}>Cancelar</Button>
              <Button onClick={handleConfirmPurchase} isLoading={saving}>
                <ClipboardList className="w-4 h-4 mr-2" /> Confirmar compra
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDetailOpen && !!selectedPurchase} onClose={closeDetails} title={selectedPurchase ? `Detalle de ${selectedPurchase.purchase_number}` : 'Detalle de compra'} className="max-w-4xl max-h-[calc(100dvh-1.5rem)]">
        {selectedPurchase && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Proveedor</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedPurchase.supplier_name || 'Sin proveedor'}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Fecha</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedPurchase.purchase_date}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedPurchase.total, activeBusiness?.currency || 'COP')}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Estado</div>
                <div className="mt-2">
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', purchaseStatusClass(selectedPurchase.status))}>
                    {PURCHASE_STATUS_LABELS[selectedPurchase.status]}
                  </span>
                </div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Condición</div>
                <div className="mt-2">
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', purchaseFlowClass(selectedPurchase))}>
                    {purchaseFlowLabel(selectedPurchase)}
                  </span>
                </div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {selectedPurchase.financial_flow === 'cash' ? 'Pago' : 'Saldo pendiente'}
                </div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {selectedPurchase.financial_flow === 'cash'
                    ? (selectedPurchase.purchase_payment_method
                      ? (PAYMENT_METHOD_LABELS[selectedPurchase.purchase_payment_method] || selectedPurchase.purchase_payment_method)
                      : 'Movimiento registrado')
                    : (selectedPurchase.financial_flow === 'payable'
                      ? formatCurrency(selectedPurchase.supplier_payable_balance_due || 0, activeBusiness?.currency || 'COP')
                      : '—')}
                </div>
              </div>
            </div>

            <div className="app-surface overflow-hidden rounded-[24px]">
              <div className="app-table-head hidden md:grid grid-cols-[2fr_120px_140px_140px] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                <div>Materia prima</div>
                <div>Cantidad</div>
                <div>Costo unitario</div>
                <div>Subtotal</div>
              </div>
              <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                {selectedPurchase.items.map((item, index) => (
                  <div key={item.id || index} className="px-4 py-4 grid grid-cols-1 md:grid-cols-[2fr_120px_140px_140px] gap-3 md:items-center text-sm">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.raw_material_name || item.description || 'Materia prima'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.raw_material_unit || 'und'}</div>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">{formatNumber(item.quantity)}</div>
                    <div className="text-gray-700 dark:text-gray-300">{formatCurrency(item.unit_cost, activeBusiness?.currency || 'COP')}</div>
                    <div className="text-gray-900 dark:text-white font-medium">{formatCurrency(item.subtotal, activeBusiness?.currency || 'COP')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="app-surface p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Trazabilidad financiera</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedPurchase.financial_flow === 'cash'
                  ? `La compra impactó caja al confirmarse y quedó registrada en Gastos / Movimientos. ${selectedPurchase.purchase_payment_method ? `Método: ${PAYMENT_METHOD_LABELS[selectedPurchase.purchase_payment_method] || selectedPurchase.purchase_payment_method}.` : ''}`
                  : selectedPurchase.financial_flow === 'payable'
                    ? `La compra generó una obligación operativa en Gastos / Por pagar. ${purchaseFlowDetail(selectedPurchase, activeBusiness?.currency || 'COP')}.`
                    : selectedPurchase.status === 'draft'
                      ? 'La compra sigue en borrador. La condición financiera se define al confirmar.'
                      : 'Esta compra no dejó impacto financiero adicional.'}
              </div>
            </div>

            {selectedPurchase.notes && (
              <div className="app-surface p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Notas</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedPurchase.notes}</div>
              </div>
            )}

            <div className="app-divider flex flex-col-reverse gap-3 border-t pt-3 sm:flex-row sm:flex-wrap">
              {canUpdate && selectedPurchase.status === 'draft' && (
                <Button variant="secondary" onClick={() => openEdit(selectedPurchase)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </Button>
              )}
              {canConfirm && selectedPurchase.status === 'draft' && (
                <Button onClick={() => openConfirmModal(selectedPurchase)} isLoading={saving}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Confirmar compra
                </Button>
              )}
              {selectedPurchase.status === 'confirmed' && purchaseTraceLabel(selectedPurchase) && (
                <Button variant="secondary" onClick={() => openFinancialTrace(selectedPurchase)}>
                  {purchaseTraceLabel(selectedPurchase)}
                </Button>
              )}
              {canUpdate && selectedPurchase.status === 'draft' && (
                <Button variant="secondary" onClick={() => handleCancelPurchase(selectedPurchase)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Cancelar compra
                </Button>
              )}
              <Button variant="secondary" onClick={closeDetails}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
      </PageBody>
    </PageLayout>
  );
};
