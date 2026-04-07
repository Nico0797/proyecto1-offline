import { useEffect, useMemo, useState } from 'react';
import { Archive, ClipboardList, Eye, Pencil, Search, SlidersHorizontal, Trash2, Truck, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { useBusinessStore } from '../store/businessStore';
import { useAccess } from '../hooks/useAccess';
import { useSupplierStore } from '../store/supplierStore';
import { supplierService } from '../services/supplierService';
import { rawPurchasesService } from '../services/rawPurchasesService';
import { supplierPayablesService } from '../services/supplierPayablesService';
import { RawPurchase, Supplier, SupplierPayable } from '../types';

const formatCurrency = (value?: number | null, currency = 'COP') => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
};

const purchaseConditionLabel = (purchase: RawPurchase) => {
  if (purchase.status !== 'confirmed' || !purchase.financial_flow) return 'Por definir';
  if (purchase.financial_flow === 'cash') return 'Contado';
  if (purchase.supplier_payable_status === 'paid' || Number(purchase.supplier_payable_balance_due || 0) <= 0.0001) return 'Por pagar • saldada';
  if (purchase.supplier_payable_status === 'partial') return 'Por pagar • abonada';
  return 'Por pagar';
};

export const Suppliers = () => {
  const { activeBusiness } = useBusinessStore();
  const { hasModule, hasPermission } = useAccess();
  const {
    suppliers,
    loading,
    saving,
    error,
    createSupplier,
    updateSupplier,
    deactivateSupplier,
    fetchSuppliers,
  } = useSupplierStore();

  const canRead = hasModule('raw_inventory') && hasPermission('suppliers.view');
  const canCreate = hasModule('raw_inventory') && hasPermission('suppliers.create');
  const canUpdate = hasModule('raw_inventory') && hasPermission('suppliers.edit');
  const canDelete = hasModule('raw_inventory') && hasPermission('suppliers.delete');
  const canReadPurchases = hasModule('raw_inventory') && hasPermission('raw_purchases.view');
  const canReadPayables = hasModule('raw_inventory') && hasPermission('supplier_payables.view');

  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [allPurchases, setAllPurchases] = useState<RawPurchase[]>([]);
  const [allPayables, setAllPayables] = useState<SupplierPayable[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailPurchases, setDetailPurchases] = useState<RawPurchase[]>([]);
  const [detailPayables, setDetailPayables] = useState<SupplierPayable[]>([]);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchSuppliers(activeBusiness.id, {
      search: searchTerm || undefined,
      include_inactive: includeInactive,
    });
  }, [activeBusiness, canRead, searchTerm, includeInactive, fetchSuppliers]);

  useEffect(() => {
    if (!activeBusiness || !canRead) {
      setAllPurchases([]);
      setAllPayables([]);
      return;
    }

    let cancelled = false;
    setContextLoading(true);

    Promise.all([
      canReadPurchases ? rawPurchasesService.list(activeBusiness.id) : Promise.resolve([] as RawPurchase[]),
      canReadPayables
        ? supplierPayablesService.list(activeBusiness.id).then((result) => result.supplier_payables || [])
        : Promise.resolve([] as SupplierPayable[]),
    ])
      .then(([purchases, payables]) => {
        if (cancelled) return;
        setAllPurchases(purchases);
        setAllPayables(payables);
      })
      .catch(() => {
        if (cancelled) return;
        setAllPurchases([]);
        setAllPayables([]);
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBusiness, canRead, canReadPayables, canReadPurchases]);

  const suppliersWithMetrics = useMemo(() => {
    return suppliers.map((supplier) => {
      const supplierPurchases = allPurchases.filter((purchase) => purchase.supplier_id === supplier.id);
      const supplierPayables = allPayables.filter((payable) => payable.supplier_id === supplier.id);
      const openPayables = supplierPayables.filter((payable) => payable.status !== 'paid' && Number(payable.balance_due || 0) > 0.0001);
      const lastPurchase = supplierPurchases.reduce<string | null>((latest, purchase) => {
        if (!purchase.purchase_date) return latest;
        if (!latest) return purchase.purchase_date;
        return purchase.purchase_date > latest ? purchase.purchase_date : latest;
      }, null);

      return {
        ...supplier,
        purchases_count: supplierPurchases.length,
        confirmed_purchases_count: supplierPurchases.filter((purchase) => purchase.status === 'confirmed').length,
        last_purchase_date: lastPurchase,
        pending_payables_count: openPayables.length,
        pending_payables_balance: Number(openPayables.reduce((total, payable) => total + Number(payable.balance_due || 0), 0).toFixed(2)),
      };
    });
  }, [suppliers, allPurchases, allPayables]);

  const activeCount = useMemo(() => suppliersWithMetrics.filter((supplier) => supplier.is_active).length, [suppliersWithMetrics]);
  const suppliersWithPendingBalance = useMemo(
    () => suppliersWithMetrics.filter((supplier) => Number(supplier.pending_payables_balance || 0) > 0.0001).length,
    [suppliersWithMetrics]
  );

  const resetForm = () => {
    setName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setIsActive(true);
  };

  const openCreate = () => {
    setEditingSupplier(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setContactName(supplier.contact_name || '');
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setNotes(supplier.notes || '');
    setIsActive(supplier.is_active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    resetForm();
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setDetailLoading(false);
    setDetailSupplier(null);
    setDetailPurchases([]);
    setDetailPayables([]);
  };

  const handleSave = async () => {
    if (!activeBusiness) return;
    if (!name.trim()) {
      toast.error('Debes ingresar el nombre del proveedor');
      return;
    }

    const payload = {
      name,
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      is_active: isActive,
    };

    try {
      if (editingSupplier) {
        await updateSupplier(activeBusiness.id, editingSupplier.id, payload);
        toast.success('Proveedor actualizado');
      } else {
        await createSupplier(activeBusiness.id, payload);
        toast.success('Proveedor creado');
      }
      closeModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible guardar el proveedor');
    }
  };

  const handleDeactivate = async (supplier: Supplier) => {
    if (!activeBusiness) return;
    if (!window.confirm(`¿Desactivar ${supplier.name}?`)) return;
    try {
      await deactivateSupplier(activeBusiness.id, supplier.id);
      toast.success('Proveedor desactivado');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible desactivar el proveedor');
    }
  };

  const openDetails = async (supplier: Supplier) => {
    if (!activeBusiness) return;
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailSupplier(supplier);
    try {
      const [freshSupplier, purchases] = await Promise.all([
        supplierService.get(activeBusiness.id, supplier.id),
        canReadPurchases ? rawPurchasesService.list(activeBusiness.id, { supplier_id: supplier.id }) : Promise.resolve([] as RawPurchase[]),
      ]);
      const payables = canReadPayables
        ? allPayables.filter((payable) => payable.supplier_id === supplier.id)
        : [] as SupplierPayable[];
      const enrichedSupplier = suppliersWithMetrics.find((item) => item.id === supplier.id);
      setDetailSupplier({
        ...freshSupplier,
        ...(enrichedSupplier || {}),
      });
      setDetailPurchases(purchases);
      setDetailPayables(payables);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible cargar el detalle del proveedor');
      closeDetail();
      return;
    }
    setDetailLoading(false);
  };

  if (!canRead) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center">
          <Archive className="w-10 h-10 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Proveedores</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tienes acceso a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout data-tour="suppliers.panel">
      <PageHeader
        title="Proveedores"
        description="Terceros operativos para abastecimiento, compras y seguimiento de obligaciones derivadas."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              {activeCount} activo(s)
            </div>
            {canReadPayables && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
                {suppliersWithPendingBalance} con saldo operativo
              </div>
            )}
            {canCreate && (
              <Button onClick={openCreate} data-tour="suppliers.primaryAction">
                <Truck className="w-4 h-4 mr-2" /> Nuevo proveedor
              </Button>
            )}
          </div>
        }
      />

      <PageBody className="space-y-6">
        <div className="app-surface p-4 shadow-sm" data-tour="suppliers.filters">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, contacto, teléfono o email..." icon={Search} />
            <Button variant={includeInactive ? 'primary' : 'secondary'} onClick={() => setIncludeInactive((value) => !value)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> {includeInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'}
            </Button>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              {loading ? 'Cargando proveedores...' : `${suppliersWithMetrics.length} proveedor(es)`}
              {contextLoading ? ' • Actualizando contexto operativo...' : ''}
            </div>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="app-surface overflow-hidden shadow-sm" data-tour="suppliers.table">
          <div className="app-table-head hidden lg:grid grid-cols-[2fr_1.4fr_1fr_140px_180px_auto] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
            <div>Proveedor</div>
            <div>Contacto</div>
            <div>Compras</div>
            <div>Última compra</div>
            <div>Saldo operativo</div>
            <div className="text-right">Acciones</div>
          </div>

          <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
            {suppliersWithMetrics.length === 0 && !loading && (
              <div className="px-4 py-6">
                <TeachingEmptyState
                  compact
                  icon={Truck}
                  title={searchTerm || includeInactive ? 'No hay proveedores con este filtro' : 'Aún no has creado proveedores'}
                  description={searchTerm || includeInactive
                    ? 'Limpia los filtros para revisar todos los proveedores registrados.'
                    : 'Empieza creando tus proveedores principales para asociar compras, inventario y obligaciones operativas sin duplicar vistas financieras.'}
                  primaryActionLabel={canCreate ? 'Nuevo proveedor' : undefined}
                  onPrimaryAction={canCreate ? openCreate : undefined}
                  secondaryActionLabel={searchTerm || includeInactive ? 'Limpiar filtros' : undefined}
                  onSecondaryAction={searchTerm || includeInactive ? (() => {
                    setSearchTerm('');
                    setIncludeInactive(false);
                  }) : undefined}
                />
              </div>
            )}

            {suppliersWithMetrics.map((supplier) => (
              <div key={supplier.id} className="app-table-row px-4 py-4 transition-colors">
                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[2fr_1.4fr_1fr_140px_180px_auto] lg:items-center lg:gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900 dark:text-white">{supplier.name}</div>
                      {!supplier.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {supplier.notes && (
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{supplier.notes}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div>{supplier.contact_name || 'Sin contacto principal'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{supplier.phone || 'Sin teléfono'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{supplier.email || 'Sin email'}</div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {canReadPurchases ? (
                      <>
                        <div className="font-medium text-gray-900 dark:text-white">{supplier.purchases_count || 0} registrada(s)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{supplier.confirmed_purchases_count || 0} confirmada(s)</div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Sin permiso para compras</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{canReadPurchases ? formatDate(supplier.last_purchase_date) : '—'}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {canReadPayables ? (
                      Number(supplier.pending_payables_balance || 0) > 0.0001 ? (
                        <>
                          <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(supplier.pending_payables_balance, activeBusiness?.currency || 'COP')}</div>
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">{supplier.pending_payables_count || 0} obligación(es) abierta(s)</div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Sin saldo pendiente</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Sin permiso para por pagar</span>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-start lg:justify-end gap-2">
                    <Button variant="secondary" onClick={() => openDetails(supplier)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canUpdate && (
                      <Button variant="secondary" onClick={() => openEdit(supplier)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && supplier.is_active && (
                      <Button variant="secondary" onClick={() => handleDeactivate(supplier)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageBody>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'} className="max-w-2xl">
        <div className="space-y-5" data-tour="suppliers.modal.form">
          <div className="rounded-[24px] border border-gray-200/80 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Identidad y contacto</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Mantén el proveedor listo para compras, seguimiento y obligaciones operativas.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Contacto" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea className="app-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {editingSupplier && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Proveedor activo
            </label>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end dark:border-gray-700">
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={saving} data-tour="suppliers.modal.confirm">Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDetailOpen && !!detailSupplier} onClose={closeDetail} title={detailSupplier ? `Detalle de ${detailSupplier.name}` : 'Detalle proveedor'} className="max-w-5xl h-[88vh]">
        {detailSupplier && (
          <div className="space-y-6">
            {detailLoading ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
                Cargando contexto operativo del proveedor...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="app-muted-panel p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Compras registradas</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{detailSupplier.purchases_count || detailPurchases.length}</div>
                  </div>
                  <div className="app-muted-panel p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Compras confirmadas</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {detailSupplier.confirmed_purchases_count || detailPurchases.filter((purchase) => purchase.status === 'confirmed').length}
                    </div>
                  </div>
                  <div className="app-muted-panel p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Saldo operativo</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {canReadPayables
                        ? formatCurrency(detailSupplier.pending_payables_balance ?? detailPayables.reduce((sum, payable) => sum + Number(payable.balance_due || 0), 0), activeBusiness?.currency || 'COP')
                        : '—'}
                    </div>
                  </div>
                  <div className="app-muted-panel p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Obligaciones abiertas</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {canReadPayables
                        ? (detailSupplier.pending_payables_count ?? detailPayables.filter((payable) => payable.status !== 'paid' && Number(payable.balance_due || 0) > 0.0001).length)
                        : '—'}
                    </div>
                  </div>
                </div>

                <div className="app-surface p-4 shadow-sm">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Rol de esta vista</div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Proveedores agrupa terceros operativos, compras asociadas y saldo pendiente si existe. Los pagos y cambios financieros siguen gestionándose desde <span className="font-medium text-gray-900 dark:text-white">Gastos / Por pagar</span>.
                  </div>
                </div>

                <div className="app-surface overflow-hidden shadow-sm">
                  <div className="app-table-head flex items-center justify-between px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Compras asociadas</div>
                    {canReadPurchases && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {detailPurchases.length} compra(s)
                      </div>
                    )}
                  </div>
                  {!canReadPurchases ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver compras asociadas.</div>
                  ) : detailPurchases.length === 0 ? (
                    <div className="p-4">
                      <TeachingEmptyState
                        compact
                        icon={ClipboardList}
                        title="Sin compras asociadas"
                        description="Este proveedor todavía no tiene compras registradas."
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {detailPurchases.map((purchase) => (
                        <div key={purchase.id} className="px-4 py-4 grid grid-cols-1 lg:grid-cols-[1.1fr_140px_140px_1fr] gap-3 lg:items-center">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{purchase.purchase_number}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{purchase.items_count || purchase.items.length} ítem(s)</div>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">{formatDate(purchase.purchase_date)}</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(purchase.total, activeBusiness?.currency || 'COP')}</div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div>{purchaseConditionLabel(purchase)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {purchase.financial_flow === 'payable'
                                ? `Saldo ${formatCurrency(purchase.supplier_payable_balance_due || 0, activeBusiness?.currency || 'COP')}`
                                : purchase.status === 'draft'
                                  ? 'Se define al confirmar'
                                  : 'Sin saldo pendiente'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-gray-200 overflow-hidden bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Obligaciones operativas relacionadas</div>
                    {canReadPayables && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {detailPayables.length} registro(s)
                      </div>
                    )}
                  </div>
                  {!canReadPayables ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No tienes permiso para ver obligaciones operativas.</div>
                  ) : detailPayables.length === 0 ? (
                    <div className="p-4">
                      <TeachingEmptyState
                        compact
                        icon={Wallet}
                        title="Sin obligaciones operativas"
                        description="Este proveedor no tiene saldo pendiente derivado de compras registradas."
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {detailPayables.map((payable) => (
                        <div key={payable.id} className="px-4 py-4 grid grid-cols-1 lg:grid-cols-[1.1fr_140px_140px_1fr] gap-3 lg:items-center">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{payable.raw_purchase_number || `Cuenta #${payable.id}`}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vence: {formatDate(payable.due_date)}</div>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(payable.amount_total, activeBusiness?.currency || 'COP')}</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(payable.balance_due, activeBusiness?.currency || 'COP')}</div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div>{payable.status === 'paid' ? 'Saldada' : payable.status === 'partial' ? 'Abonada' : 'Pendiente'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Los pagos se gestionan desde Gastos / Por pagar.</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end dark:border-gray-700">
              <Button variant="secondary" onClick={closeDetail}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};
